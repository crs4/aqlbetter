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

import { Injectable } from '@angular/core';
import {CommonUtil} from '../shared';
import {StorageKey} from '../shared/models/app.model';

@Injectable({
  providedIn: 'root'
})
export class AppContextService {
  private resourceUrl: string;
  private token: string;
  private refreshToken: string;

  constructor() {
    this.initialize();
  }

  getResourceUrl(): string {
    return this.resourceUrl;
  }

  getServerUrl(): string {
    return CommonUtil.removeTrailingSlash(this.resourceUrl);
  }


  getRestUrl(): string {
    return CommonUtil.removeTrailingSlash(this.resourceUrl) + '/rest/openehr/v1';
  }

  //ECIS
  // getRestUrlwt(): string {
  //   return CommonUtil.removeTrailingSlash(this.resourceUrl) + '/rest/ecis/v1';
  // }

  getRestUrlwt(): string {
    return CommonUtil.removeTrailingSlash(this.resourceUrl) + '/rest/openehr/v1';
  }


  getAdminRestUrl(): string {
    return CommonUtil.removeTrailingSlash(this.resourceUrl) + '/rest/admin';
  }

  getToken(): string {
    return this.token;
  }

  getCredentials(): {username: string, password: string} {
    const credentials = {username: null, password: null};
    if (!!this.getToken()) {
      try {
        const [username, password] = atob(this.getToken()).split(':');
        credentials.username = username;
        credentials.password = password;
      } catch (e) {
        console.error(e);
      }
    }
    return credentials;
  }

  createBasicToken(username: string, password: string) {
    return btoa(username + ':' + password);
  }

  setToken(token: string): void {
    this.token = token;
  }

  setRefreshToken(refreshToken: string) {
    this.refreshToken = refreshToken;
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  setResourceUrl(resourceUrl: string): void {
    this.resourceUrl = resourceUrl;
  }

  setContext(resourceUrl: string, token: string, refreshToken?: string): void {
    this.setResourceUrl(resourceUrl);
    this.setToken(token);
    this.setRefreshToken(refreshToken);
    this.saveToStorage();
  }

  initialize(): void {
    const context = JSON.parse(localStorage.getItem(StorageKey.AQL_CONTEXT));
    if (context) {
      this.setContext(context.resourceUrl, context.token);
    }
  }

  clear() {
    this.setToken(undefined);
    this.setResourceUrl(undefined);
    this.setRefreshToken(undefined);
    localStorage.removeItem(StorageKey.AQL_CONTEXT);
  }

  private saveToStorage() {
    const payload = JSON.stringify({
      resourceUrl: this.getResourceUrl(),
      token: this.getToken()
    });
    localStorage.setItem(StorageKey.AQL_CONTEXT, payload);
  }
}

