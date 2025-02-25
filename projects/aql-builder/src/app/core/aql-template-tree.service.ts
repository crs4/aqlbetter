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

import {Injectable} from '@angular/core';
import {Template, TreeNode} from '../shared/models';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {PlatformLocation} from '@angular/common';
import {MonacoAutocompleteHelper} from '../aql-builder/monaco/monaco-autocomplete.helper';
import {RmType} from '../shared/models/rm-type.enum';

@Injectable({
  providedIn: 'root'
})
export class AqlTemplateTreeService {
  private attributeExclusions: Readonly<Array<string>> = ['mappings', 'charset', 'thumbnail'];
  private dvTypeExclusions: Readonly<Array<RmType>> = [RmType.DV_MULTIMEDIA];

  flatTreeNodeStore: Map<string, TreeNode>;
  template: Template;
  rmTypeMap: Map<string, any> = new Map<string, any>();

  constructor(private httpClient: HttpClient,
              private platformLocation: PlatformLocation) {
    this.getRmTypesDetails().subscribe(data => {
      Object.keys(data?.types).forEach(key => {
        this.rmTypeMap.set(key, data?.types[key]);
      });
    });
  }

  setTemplate(template: Template): void {
    this.template = template;
    this.flatTreeNodeStore = new Map<string, TreeNode>();
    const webTemplateTree = this.template.tree as unknown as TreeNode;
    this.flatTreeNodeStore.set(webTemplateTree.aqlPath, webTemplateTree);

    this.addChildren(webTemplateTree.children);
  }

  addAdditionalAttributesToTree(treeNode: TreeNode): TreeNode {
    const rmType = treeNode.rmType;
    if (!rmType) {
      return;
    }
    if (this.rmTypeMap.has(rmType.toString())) {
      const rmTypeMetaData = this.rmTypeMap.get(rmType.toString());

      this.addAttributes(treeNode, rmTypeMetaData);
    }

    if (treeNode.children) {
      treeNode.children.forEach(ch => {
        this.addAdditionalAttributesToTree(ch);
      });
    }

    return treeNode;
  }

  private addAttributes(treeNode: TreeNode, rmTypeMetaData: any): void {
    if (this.dvTypeExclusions.includes(rmTypeMetaData.name)) {
      return;
    }

    const rmTypeAttributes = rmTypeMetaData?.value ? rmTypeMetaData?.value?.attributes : rmTypeMetaData?.attributes;

    Object.keys(rmTypeAttributes).forEach(attKey => {
      if (this.attributeExclusions.includes(attKey)) {
        return;
      }

      if (!this.rmTypeMap.has(attKey)) {
        const child = this.getDetailedNode(treeNode, attKey, rmTypeAttributes);
        if (treeNode.children) {
          if (!this.alreadyHasAttribute(treeNode, attKey)) {
            treeNode.children.push(child);
          }
        } else {
          treeNode.children = [child];
        }

        const targetType = rmTypeAttributes[attKey]?.targetType;
        if (targetType && this.rmTypeMap.has(targetType)) {
          const node = this.rmTypeMap.get(targetType);
          const nodeAncestors = node?.ancestors;
          const lastChild = treeNode.children[treeNode.children.length - 1];
          if (nodeAncestors && node?.type !== 'PRIMITIVE') {
            nodeAncestors.forEach(an => {
              this.addAttributes(lastChild, this.rmTypeMap.get(an));
            });
          }
          this.addAttributes(lastChild, node);
        }
      }
    });

    const ancestors = rmTypeMetaData?.ancestors;
    if (ancestors) {
      ancestors.forEach(an => {
        this.addAttributes(treeNode, this.rmTypeMap.get(an));
      });
    }
  }

  private getDetailedNode(treeNode: TreeNode, attKey: string, rmTypeAttributes: any): TreeNode {
    const path = `${treeNode.formId || treeNode.aqlPath || ''}/${attKey}`;
    const childRmType = rmTypeAttributes[attKey]?.rmType || rmTypeAttributes[attKey]?.targetType;
    const beautyName = this.getNameInEditor(attKey, treeNode, rmTypeAttributes);

    return {
      id: attKey,
      name: attKey,
      editorName: beautyName,
      formId: path,
      rmType: childRmType,
      aqlPath: path,
      parentModel: treeNode,
      detailed: true
    } as TreeNode;
  }

  private getNameInEditor(attKey: string, treeNode: TreeNode, rmTypeAttributes: any): string {
    if (!treeNode.detailed) {
      return `${treeNode.name || treeNode.id}/${attKey}`.replace(MonacoAutocompleteHelper.variableNameRegex, '_');
    } else {
      const path = `${treeNode.formId || treeNode.aqlPath || ''}/${attKey}`;
      return this.getNameInEditor(path, treeNode.parentModel, rmTypeAttributes);
    }
  }

  private alreadyHasAttribute(treeNode: TreeNode, attKey: string): boolean {
    return treeNode.children.some(ch => ch.formId === `${treeNode.formId || treeNode.aqlPath || ''}/${attKey}`);
  }

  private getRmTypesDetails(): Observable<any> {
    return this.httpClient.get(`${this.platformLocation.getBaseHrefFromDOM()}assets/rmtype-details.json`);
  }

  private addChildren(children: TreeNode[]): void {
    children.forEach(child => {
      this.flatTreeNodeStore.set(child.aqlPath, child);
      if (child.children && child.children.length) {
        this.addChildren(child.children);
      }
    });
  }
}
