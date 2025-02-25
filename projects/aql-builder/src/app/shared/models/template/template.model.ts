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

import {CommonUtil} from '../../common.util';
import {RmType} from '../rm-type.enum';

export class TemplateIDList {
  templates: TemplateID[];
}

// export class TemplateID {
//   templateId: string;
//   createdOn: string;
// }

export class TemplateID {
  template_id: string;
  created_timestamp: string;
  concept: string;
  archetype_id: string;
}

// export interface Template {
//   meta: MetaData;
//   webTemplate: WebTemplate;
//   action: string;
// }
export interface Template {
  templateId: string;
  version: string;
  defaultLanguage: string;
  defaultTerminology: string;
  languages: string[];
  tree: any;
}

interface MetaData {
  href: string;
}

export class TreeNode {
  id: string;
  name: string;
  localizedName: string;
  localizedNames: {};
  localizedDescriptions: Map<string, string>;
  nodeId: string;
  formId: string;
  min: number;
  max: number;
  aqlPath: string;
  children?: TreeNode[];
  inContext: boolean;
  viewConfig?: any; // TODO: string
  rmType?: RmType;
  dragDisabled?: boolean;
  availableTypes?: string[];
  anyFieldParent?: TreeNode;
  parentModel?: TreeNode;
  /* Beautified name - alias. Used in aql-builder editor */
  editorName?: string;
  detailed?: boolean;
  generic?: boolean;

  constructor() {
    this.id = CommonUtil.getUUID();
  }
}

// export interface WebTemplate {
//   templateId: string;
//   version: string;
//   defaultLanguage: string;
//   defaultTerminology: string;
//   languages: string[];
//   tree: any;
// }
