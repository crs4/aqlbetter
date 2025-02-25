/* Copyright 2021 Better Ltd (www.better.care)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, TemplateRef} from '@angular/core';
import {HistoryItem, SnippetItem} from '../../../shared/models/code-snippet-model';
import {CodeSnippetService} from '../../../core/code-snippet.service';
import {EhrView} from '../../../shared/models/ehr-view.model';
import {DropdownItem, DropdownSelectedItem} from '../../../shared/dropdown-input/dropdown.model';
import {EhrApiService} from '../../../core/ehr-api.service';
import {AdditionalAqlAutocompleteKeyword} from '../../monaco/monaco-aql.model';
import {Template, TemplateID, TreeNode} from '../../../shared';
import {DataParserService} from '../data-parser.service';
import {combineLatest, Observable, Subject} from 'rxjs';
import {TabService} from '../../../core/tab.service';
import {Tab, TabType} from '../tab.model';
import {EditorData} from '../editor-data.model';
import {AutocompleteObjectsStore} from '../../../core/autocomplete-objects.store';
import {debounceTime, distinctUntilChanged, finalize, map, startWith, switchMap, take, takeUntil, tap} from 'rxjs/operators';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {cloneDeep} from 'lodash';
import {MenuService} from '../../../menu/menu.service';
import {MenuPanel} from '../../../menu/menu.enum';
import {DomSelectorsEnum, DomUtil} from '../../../shared/dom.util';
import {KeyValue} from '@angular/common';
import {AqlTemplateTreeService} from '../../../core/aql-template-tree.service';
import {TemplatePresentation} from './template-presentation.enum';
import {SpinnerService} from '../../../shared/spinner/spinner.service';
import {ImportComponent} from '../../../navbar/import/import.component';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {ToastrWrapperService, ToastType} from '../../../shared/toastr-wrapper.service';
import {ToastContent} from '../../../shared/models/app.model';


@Component({
  selector: 'aql-sidebar-content-panel',
  templateUrl: './sidebar-content-panel.component.html',
  styleUrls: ['./sidebar-content-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarContentPanelComponent implements OnInit, OnDestroy {
  @Input() isSidebarPanelOpen = true;
  @Output() toggleSidebarPanel = new EventEmitter();
  selectedPanel: MenuPanel;
  MenuPanel = MenuPanel;
  TemplatePresentation = TemplatePresentation;
  views$: Observable<Map<string, EhrView>>;
  snippets$: Observable<SnippetItem[]>;
  PredefinedObjects = PredefinedObject;
  predefinedObject: PredefinedObject;
  AdditionalAqlAutocompleteKeyword = AdditionalAqlAutocompleteKeyword;
  tree: TreeNode;
  templates: Observable<TemplateID[]>;
  template: Template;
  searchTemplate = new FormControl();
  searchViews: FormControl = new FormControl();
  templatePresentation = TemplatePresentation.MIN;
  history$: Observable<HistoryItem[]>;
  history: Map<number, HistoryItem[]> = new Map();

  searchTree = new FormControl();
  selectedHighlightIndex = 0;
  numberOfHighlightedFields = 0;
  treeSearchTerm: Observable<string>;

  templateLanguages: DropdownItem<unknown>[];
  selectedTemplateLanguage: string;
  views: Observable<EhrView[]>;
  deleteViewForm: FormGroup = this.fb.group({
    name: null,
    description: null,
    version: null,
    confirm: [false, [Validators.requiredTrue]]
  });


  private unsubscribe: Subject<void> = new Subject<void>();
  private originalTemplate: Template;
  private selectedHighlightedField: HTMLElement;
  private deletePrompt: NgbModalRef;

  @HostListener('document:keyup', ['$event'])
  moveUp($event) {
    if (!this.numberOfHighlightedFields) {
      return;
    }

    if ($event.keyCode === 38) {
      this.prevHighlightedField();
    }

    if ($event.keyCode === 40) {
      this.nextHighlightedField();
    }
  }

  constructor(public codeSnippetService: CodeSnippetService,
              private dataParserService: DataParserService,
              private ehrApiService: EhrApiService,
              private tabService: TabService,
              private cd: ChangeDetectorRef,
              private menuService: MenuService,
              private templateTreeService: AqlTemplateTreeService,
              private fb: FormBuilder,
              private ngbModal: NgbModal,
              private toastrWrapperService: ToastrWrapperService,
              public spinnerService: SpinnerService) { }

  ngOnInit(): void {
    this.codeSnippetService.initialize();

    this.codeSnippetService.updateViews
      .pipe(
        takeUntil(this.unsubscribe),
        startWith(true),
        switchMap(() => this.ehrApiService.getViews())
      )
      .subscribe( (data: any[]) => {
        this.codeSnippetService.setViewItems(data);
        this.views$ = this.codeSnippetService.views$;
        //console.log('vview',this.views$);
        //this.views$.subscribe(data => {
        //console.log('Dataaaa:', data);
        //});
        this.updateViews();
        this.cd.detectChanges();
      });

    this.snippets$ = this.codeSnippetService.snippets$;
    this.history$ = this.codeSnippetService.history$;

    this.history$.pipe(
      takeUntil(this.unsubscribe)
    ).subscribe((data: HistoryItem[]) => {
      this.history.clear();

      data.forEach(entry => {
        const date = new Date(entry.timeStamp).setHours(0, 0, 0, 0) as number;

        if (!this.history.has(date)) {
          this.history.set(date, [entry]);
        } else {
          const items = this.history.get(date);
          this.history.set(date, [...items, entry]);
        }

      });
      this.cd.markForCheck();
    });

    this.updateTemplates();

    ImportComponent.notifyImport
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(_ => {
        this.updateTemplates();
        this.cd.markForCheck();
      });

    this.menuService.selectedMenuItem$.pipe(takeUntil(this.unsubscribe)).subscribe(data => {
      if (data === this.selectedPanel &&
          this.selectedPanel === MenuPanel.TEMPLATES &&
          !!this.template &&
          this.isSidebarPanelOpen) {
        this.showTemplateList();
      }
      if (data === this.selectedPanel &&
          this.selectedPanel === MenuPanel.PREDEFINED &&
          !!this.predefinedObject &&
          this.isSidebarPanelOpen) {
        this.togglePredefinedObject(null);
      }
      if (!this.isSidebarPanelOpen) {
        this.toggleSidebarPanel.emit();
      }

      this.selectedPanel = data;
      // this.userSettingsStorageService.updateUserSettings(UserSettingsProps.lastSelectedAqlPanel, data);

      if (data === MenuPanel.TEMPLATES && !this.template && this.isSidebarPanelOpen) {
        setTimeout(() => {
          const templateSearchEl = DomUtil.getElementById('template-search');
          if (templateSearchEl) {
            templateSearchEl.focus();
          }
        }, 50);
      }

      this.treeSearchTerm = this.searchTree.valueChanges
        .pipe(
          startWith(''),
          distinctUntilChanged(),
          debounceTime(250),
          tap((term) => {
            this.clearSearchTree();
            if (!term) {
              return;
            }

            this.selectHighlightedField(this.selectedHighlightIndex);
          })
        );

      this.cd.markForCheck();
    });

    this.menuService.selectMenuItem(MenuPanel.TEMPLATES);
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  orderHistoryDesc(a: KeyValue<number, HistoryItem[]>, b: KeyValue<number, HistoryItem[]>): number {
    return b.key - a.key;
  }

  getRootTreeNode(keyword: AdditionalAqlAutocompleteKeyword, force = false): any {
    // tslint:disable-next-line:max-line-length
    if (!force && this.tree && [this.tree.name.toUpperCase(), this.tree.name.toLowerCase()].includes(AdditionalAqlAutocompleteKeyword[keyword])) {
      return this.tree;
    }
    this.showSpinner();
    const staticObject = AutocompleteObjectsStore.predefinedObjects.get(keyword);
    this.tree = new TreeNode();
    this.tree.name =  AdditionalAqlAutocompleteKeyword[keyword].toLowerCase();
    this.tree.formId = this.tree.name;
    this.tree.rmType = undefined;
    this.dataParserService.parseStaticObject(staticObject, this.tree, this.templatePresentation);

    this.hideSpinner();

    return this.tree;
  }

  removeHistoryItem(index: number): void {
    this.codeSnippetService.removeHistoryItem(index);
  }

  removeSnippetItem(index: number): void {
    this.codeSnippetService.removeSnippetItem(index);
  }

  loadViewItem(view: EhrView): void {
      //console.log('loadviewitem',view);
      const tabIndex = this.tabService.tabs.findIndex(existingTab => {
        const tabView = existingTab.view;
        return tabView?.version === view.version && tabView?.name === view.name && tabView?.type === view.type;
      });

      if (tabIndex > -1) {
        this.tabService.setActiveTab(tabIndex);
        return;
      }

      const editor = new EditorData();
      editor.code = view.steps.processorData;
      const tab = new Tab(TabType.VIEW, editor, view.name);
      tab.view = view;
      this.tabService.createTab(tab);
  }

  openTab(item: SnippetItem): void {
    const editor = new EditorData();
    let type = TabType.SNIPPET;
    editor.code = item.code;

    if (item instanceof HistoryItem) {
      editor.aqlParameters = new Map(item.params);
      type = TabType.NEW_QUERY;
      item.name = item.name || item.timeStamp.toString();
    }

    this.tabService.createTab(new Tab(type, editor, item.name || null));
  }

  loadTemplate(templateId: string): void {
    this.showSpinner();
    //templateId='BBMRI-ERIC_Colorectal_Cancer_Cohort_Report';
    this.ehrApiService.getTemplate(templateId)
      .subscribe(t => {
        this.templateLanguages = t.languages.map(l => ({value: l, label: l, disabled: false}) as DropdownItem<unknown>);
        this.selectedTemplateLanguage = t.defaultLanguage;
        this.originalTemplate = t;
        this.template = cloneDeep(t);
        this.templateTreeService.setTemplate(this.template);
        this.hideSpinner();
        this.cd.markForCheck();
      });
  }

  showTemplateList(): void {
    this.template = null;
    this.cd.markForCheck();
  }

  togglePredefinedObject(object: PredefinedObject): void {
    this.predefinedObject = object;
    this.cd.markForCheck();
  }

  clearSearch(type: MenuPanel): void {
    if (type === MenuPanel.TEMPLATES) {
      this.searchTemplate.setValue('');
    } else if (type === MenuPanel.VIEWS) {
      this.searchViews.setValue('');
    }
  }

  changeTemplatePresentation(templatePresentation: TemplatePresentation): void {
    this.showSpinner();
    this.templatePresentation = templatePresentation;
    if (this.predefinedObject) {
      this.getRootTreeNode(AdditionalAqlAutocompleteKeyword.EHR, true);
    } else {
      this.template = cloneDeep(this.originalTemplate);
    }
    this.hideSpinner();
    this.cd.detectChanges();
  }

  selectHighlightedField(index: number): void {
    if (this.selectedHighlightedField) {
      this.selectedHighlightedField.classList.remove(DomSelectorsEnum.HIGHLIGHTED_FIELD_SELECTED);
    }

    const highlightedFields = DomUtil.getElementsBySelector('.' + DomSelectorsEnum.HIGHLIGHTED_FIELD);
    this.numberOfHighlightedFields = highlightedFields.length;
    if (this.numberOfHighlightedFields) {
      this.selectedHighlightedField = highlightedFields[index] as HTMLElement;
      this.selectedHighlightedField.classList.add(DomSelectorsEnum.HIGHLIGHTED_FIELD_SELECTED);
      this.selectedHighlightedField.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'});
    }
  }

  clearSearchTree(): void {
    if (this.selectedHighlightedField) {
      this.selectedHighlightedField.classList.remove(DomSelectorsEnum.HIGHLIGHTED_FIELD_SELECTED);
      this.selectedHighlightedField = null;
      this.selectedHighlightIndex = 0;
    }
  }

  nextHighlightedField(): void {
    this.selectedHighlightIndex += 1;
    if (this.selectedHighlightIndex === this.numberOfHighlightedFields) {
      this.selectedHighlightIndex = 0;
    }
    this.selectHighlightedField(this.selectedHighlightIndex);
  }

  prevHighlightedField(): void {
    this.selectedHighlightIndex -= 1;
    if (this.selectedHighlightIndex < 0) {
      this.selectedHighlightIndex = this.numberOfHighlightedFields - 1;
    }
    this.selectHighlightedField(this.selectedHighlightIndex);
  }

  private showSpinner(): void {
    this.spinnerService.showSidebarSpinner();
  }

  private hideSpinner(): void {
    setTimeout(() => {
      this.spinnerService.hideSidebarSpinner();
    }, 100);
  }

  private updateTemplates() {
    const templates = this.ehrApiService.getTemplateIDs();

    // templates.subscribe(data => {
    //   console.log('Templates Data:', data);
    //   console.log(data[0].template_id)
    // });
  
    const filterInput = this.searchTemplate
      .valueChanges
      .pipe(
        startWith(''),
        debounceTime(100));

    this.templates = combineLatest([templates, filterInput])
      .pipe(
        map((templateRes: [TemplateID[], string]) => {
          return templateRes[0].filter(
            templateID => templateID.template_id.toLowerCase().indexOf(templateRes[1].toLowerCase()) > -1
          );
        })
      );
  }

  private updateViews() {
    const filterInput = this.searchViews
      .valueChanges
      .pipe(startWith(''), debounceTime(250));

  //  this.views$.subscribe(data => {
  //     console.log('Views Data:', data);
  //     console.log(data)
  //   });

    //this.views$ = this.ehrApiService.getViews();

    this.views = combineLatest([this.views$, filterInput])
      .pipe(
        map(([viewMap, term]) => {
          return Array.from(viewMap.values()).filter((view: EhrView) => view.name.toLowerCase().includes(term));
        }));
  }

  changeSelectedLanguage($event: DropdownSelectedItem<any>) {
    this.selectedTemplateLanguage = $event.item.value;
  }

  openDeletePrompt($event: Event, view: EhrView, modal: TemplateRef<any>) {
    $event.preventDefault();
    this.deleteViewForm.patchValue(view);
    //console.log('odd',this.deleteViewForm);
    //console.log(this.deleteViewForm.get('name').value);
    //console.log(this.deleteViewForm.get('version').value);
    this.deletePrompt = this.ngbModal.open(modal, {backdrop: 'static'});
  }

  closeModal() {
    this.deletePrompt.close();
    this.deleteViewForm.reset();
  }

  deleteView() {
    this.spinnerService.showSidebarSpinner();
    this.ehrApiService.deleteView(this.deleteViewForm.get('name').value,this.deleteViewForm.get('version').value)
      .pipe(
        take(1),
        finalize(() => {
          this.spinnerService.hideSidebarSpinner();
          this.deleteViewForm.reset();
          this.closeModal();
        })
      )
      .subscribe(
        () => {
          this.codeSnippetService.updateViews.next();
          this.toastrWrapperService.handleToast(ToastType.SUCCESS, new ToastContent('DELETE_VIEW.SUCCESS'));
        },
        (err) => {
          this.toastrWrapperService.handleToast(ToastType.ERROR, new ToastContent(err.message, 'ERRORS.DELETE_VIEW_ERROR'), err);
        },
        () => this.searchViews.setValue(''));
  }
}

export enum PredefinedObject {
  EHR = 'EHR',
  COMPOSITION = 'COMPOSITION',
  VERSION = 'VERSION',
  VERSIONED_OBJECT = 'VERSIONED_OBJECT',
}
