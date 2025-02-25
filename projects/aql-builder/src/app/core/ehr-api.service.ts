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
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Template, TemplateID, TemplateIDList} from '../shared/models/template/template.model';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {EhrView, EhrViewSteps, EhrViewType} from '../shared/models/ehr-view.model';
import {AqlResultSet} from '../shared/models/result-set.model';
import {AppContextService} from './app-context.service';
import { from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';


interface VersionedItem {
  name: string;
  version: string;
  type: EhrViewType;
  saved: Date;
  q: string;
  // Any other properties relevant to the items
}

interface PlutoResponse {
  versions: VersionedItem[];
  // Any other properties relevant to the response
}

interface SrvrResponse {
  build:{
    group: string;
  }
}



@Injectable({
  providedIn: 'root'
})
export class EhrApiService {

  constructor(private appContextService: AppContextService,
              private http: HttpClient) {
  }


  getTemplateIDs(): Observable<TemplateID[]> {
    return this.http.get<TemplateID[]>(`${this.getApiUrl()}/definition/template/adl1.4`, {headers: this.getHeaders()})
      .pipe(
        map(item => item ? item : [] ),
        catchError(() => {
          return of([]);
        })
      );
  }



  getTemplate(templateId: string): Observable<Template> {
    //console.log('gettemplate',templateId)
    //templateId='BBMRI-ERIC_Colorectal_Cancer_Cohort_Report'
    return this.http.get<Template>(`${this.getApiUrlwt()}/definition/template/adl1.4/${encodeURIComponent(templateId)}`)
      .pipe(
        map(template => {
          this.addParents(template.tree);
          return template;
        })
      );
  }

  getWebTemplate(templateId: string): Observable<Template> {
    return this.http.get<Template>(`${this.getApiUrlwt()}/definition/template/adl1.4/${encodeURIComponent(templateId)}`, {headers: this.getHeaders()});
  }

//ECIS
  // getTemplate(templateId: string): Observable<Template> {
  //   //console.log('gettemplate',templateId)
  //   //templateId='BBMRI-ERIC_Colorectal_Cancer_Cohort_Report'
  //   return this.http.get<Template>(`${this.getApiUrlwt()}/template/${encodeURIComponent(templateId)}`)
  //     .pipe(
  //       map(template => {
  //         this.addParents(template.webTemplate.tree);
  //         return template;
  //       })
  //     );
  // }

  // getWebTemplate(templateId: string): Observable<Template> {
  //   return this.http.get<Template>(`${this.getApiUrlwt()}/template/${encodeURIComponent(templateId)}`, {headers: this.getHeaders()});
  // }



  deleteTemplate(templateId: string): Observable<any> {
    return this.http.delete(`${this.getAdminApiUrl()}/templates/${templateId}`, {headers: this.getHeaders()});
  }

  importTemplate(payload: File): Observable<Template> {
    // let pippo = this.getHeaders();
    //console.log('type headers',typeof(pippo));
    //console.log('headers importtemplate',pippo);
    // return this.http.post<Template>(`${this.getApiUrl()}/definition/template/adl1.4/`, payload, {headers: this.getHeaders()});
    return this.http.post<Template>(`${this.getApiUrl()}/definition/template/adl1.4/`, payload, {headers: {'Content-Type':'application/XML'}});
  }

  // getViews(allowedFormats = [EhrViewType.JSON_AQL, EhrViewType.JS]): Observable<any[]> {
    

  //   return this.http.get<any[]>(`${this.getApiUrl()}/definition/query`).pipe(
  //     map(view => view && view.filter(v => allowedFormats.includes(v?.steps?.[0]?.processorName))),
  //     switchMap((data) => data ? of(data) : of([]))
  //   );
  // }



    getViews(allowedFormats = [EhrViewType.JSON_AQL]): Observable<any[]> {

    // let pippo = this.http.get<any[]>(`${this.getApiUrl()}/definition/query`);
    // console.log('view',pippo);
    // pippo.subscribe(data => {
    //   console.log('Data:', data);
    // });

//    let pluto = this.http.get<any[]>(`${this.getApiUrl()}/definition/query`); 
    let pluto = this.http.get<PlutoResponse>(`${this.getApiUrl()}/definition/query`);   
    // .pipe(
    //   map(view => view ),
    //   switchMap((data) => data ? of(data) : of([]))
    // );
    //console.log('pluto',pluto);
    // pluto.subscribe(data2 => {
    // console.log('Data2:', data2);
     
    // for (var d of data2.versions){
    //   console.log('d.name',d.name)
    //   let addinfo = this.http.get<EhrView>(`${this.getApiUrl()}/definition/query/${d.name}/${d.version}`);
    //   console.log('addinfo',addinfo);
    //   console.log('type',typeof(addinfo));
    //   addinfo.subscribe(data3 => {
    //     console.log('Data3:', data3);
    //     d.steps = new EhrViewSteps(data3.q,d.type);
    //     console.log('dsteps',d.steps);

    //      });
    //   }
    //   console.log('Data2final:', data2);
    //   return data2;
    // });
    


    
// // Process each item in the array from obs1$ to fetch additional data
return pluto.pipe(
  switchMap( array1  => {
    // Convert array1 to a stream of individual items
    return from(array1.versions).pipe(
      // For each item, fetch additional data based on the name
      mergeMap(item1 => {
        return this.http.get<VersionedItem>(`${this.getApiUrl()}/definition/query/${item1.name}/${item1.version}`).pipe(
          map(additionalData => {
            const ehrviewstep = new EhrViewSteps(additionalData.q,item1.type);
            // Combine the item with the additional data if found
            return additionalData
            ? { ...item1, steps: ehrviewstep } // Overwrite `processorData`
            : item1; // Return the item unchanged if no additional data is found
          })
        );
      }),
      // Collect all the results back into an array
      //map(resultArray => resultArray)
      toArray()
    );
  })
)as Observable<any[]>;


//console.log(combined);
// combined.subscribe(combinedData => {
//   console.log('Combined Data:', combinedData);
// }


//return combined;





    // return this.http.get<any[]>(`${this.getApiUrl()}/definition/query`).pipe(
    //   map(view => view ),
    //   switchMap((data) => data ? of(data) : of([]))
    // );
  }


  getView(name: string, version: string): Observable<any> {
    return this.http.get<any[]>(`${this.getApiUrl()}/definition/query/${name}/${version}`);
  }

  saveView(payload: EhrView): Observable<any> {
    const body: any = Object.assign({}, payload);
    //console.log('body_in',body);
    // Convert steps from object to array -- Remove this once platform drops support for multiple steps in one view
    body.steps = [payload.steps];
    if (body.version){
      let bsplitted = body.version.split('.');
      let b=Number(bsplitted[bsplitted.length-1])+1;
      bsplitted[bsplitted.length-1]=b+'';
      body.version=bsplitted.join('.');
    } else{
      body.version='1.0.0';
    }
    //body.saved=new Date().toJSON();
    //console.log('body_out',body)
    let aqltext = body.steps[0].processorData;
    //console.log('aqltext before calls',aqltext);
    // let aqlstring = {};
    // aqlstring['q']=aqltext;
  //  const myquery = JSON.stringify(aqlstring);

  // const server = 'org.ehrbase.openehr';
  // let fullname = server + '::' + body.name;
  //  return this.http.put<any>('/api/ehrbase/rest/openehr/v1/definition/query/'+`${fullname}/${body.version}?`+ new URLSearchParams({
  //   type: 'AQL', format: 'RAW'}), myquery,{headers: {'Content-Type':'application/json'}});
  //const myquery="{\"q\":\"SELECT c/uid/value FROM EHR e CONTAINS COMPOSITION c\"}"
  // return this.http.put<any>('/api/ehrbase/rest/openehr/v1/definition/query/'+`${fullname}/${body.version}?`+ new URLSearchParams({
  //   type: 'AQL', format: 'RAW'}), myquery,{headers: {'Content-Type':'application/json'}});
    return this.http.get<SrvrResponse>('/api/ehrbase/management/info',{headers: {'Content-Type':'text/plain'}}).pipe(
        switchMap(firstData => {
          //console.log(firstData.build.group);
          //console.log('this way. no error',firstData.build.group);
          const server = firstData?.build.group || 'org.ehrbase.local';
          let fullname = server + '::' + body.name;
          return this.http.put<any>(`${this.getApiUrl()}/definition/query/${fullname}/${body.version}?`+ new URLSearchParams({
              type: 'AQL', format: 'RAW'}),aqltext,{headers: {'Content-Type':'text/plain'}});
        })
        ,
        catchError(error => {
          //console.error('Error in the first HTTP call:', error);
          const server = 'org.ehrbase.local';
          let fullname = server + '::' + body.name;
          return this.http.put<any>(`${this.getApiUrl()}/definition/query/${fullname}/${body.version}?`+ new URLSearchParams({
            type: 'AQL', format: 'RAW'}), aqltext,{headers:{'Content-Type':'text/plain'}});              
        })
      );
    }



// combined.subscribe(combinedData => {
//   console.log('Combined Data:', combinedData);
// }


    // const server = servercall['group'];
    // console.log(server);
    // return this.http.put<any>(`${this.getApiUrl()}/definition/query/${body.name}/${body.version}?`+ new URLSearchParams({
    //   type: 'AQL', format: 'RAW'}), aqltext,{headers: {'Content-Type':'text/plain'}});
  

  updateView(payload: EhrView): Observable<any> {
    //console.log('updateView---------------------');
    const body: any = Object.assign({}, payload);

    // Convert steps from object to array -- Remove this once platform drops support for multiple steps in one view
     body.steps = [payload.steps];
    if (body.version){
      let bsplitted = body.version.split('.');
      let b=Number(bsplitted[bsplitted.length-1])+1;
      bsplitted[bsplitted.length-1]=b+'';
      body.version=bsplitted.join('.');
    } else{
      console.error('no version included');
    }
    //body.saved=new Date().toJSON();
    //console.log('body_out',body)
    let aqltext = body.steps[0].processorData;
    //console.log('aqltext before calls',aqltext);

    return this.http.put<any>(`${this.getApiUrl()}/definition/query/${body.name}/${body.version}?`+ new URLSearchParams({
      type: 'AQL', format: 'RAW'}),aqltext,{headers: {'Content-Type':'text/plain'}});
    // return this.http.put<any>(`${this.getAdminApiUrl()}/views/${payload.name}`, body);
  }

  deleteView(viewName: string,version: string): Observable<any> {
    //console.log('deleteview',viewName);
    //console.log('version',version);
    return this.http.delete(`${this.getAdminApiUrl()}/query/${viewName}/${version}`);
  }

  getAqlQueryResultWithParameters(aql: string, params?: Map<string, string | number>): Observable<AqlResultSet> {
    //console.log('aql',aql);
    let aqlnew=aql.replace(/\n/g, " ")
    let headers = new HttpHeaders();
    headers = headers.append('Content-Type', 'application/json');
    const aqlRequest = {
      'q':aqlnew,
      'query_parameters': params ? this.createAqlParamsObject(params) : {}
    };
    //console.log('aqlrequest',aqlRequest)
    //console.log(`${this.getApiUrl()}/query/aql`)
    //console.log(headers)

    // let pippo=this.http.post(`${this.getApiUrl()}/query/aql`, aqlRequest,{headers: headers});
    // // .pipe(
    // //   map((resultSet: any) => {
    // //     if (resultSet) {
    // //       return {
    // //         aql: resultSet?.aql || null,
    // //         executedAql: resultSet?.executeAql || null,
    // //         resultSet: resultSet?.resultSet || []
    // //       };
    // //     }
    // //     return {aql: null, executedAql: null, resultSet: []};
    // //   })
    // // );
    // console.log('pippo',pippo);
    // pippo.subscribe(data => {
    //   console.log('Data:', data);
    // });
    return this.http.post(`${this.getApiUrl()}/query/aql`, aqlRequest)
      .pipe(
        map((resultSet: any) => {
          if (resultSet) {
            return {
              aql: resultSet?.q || null,
              executedAql: resultSet?.meta._executed_aql || null,
              resultSet: resultSet?.rows || []
            };
          }

          return {aql: null, executedAql: null, resultSet: []};
        })
      );
  }

  getAqlCsv(aql: string, params?: Map<string, string |number>): Observable<any> {
    const aqlRequest = {
      aql,
      aqlParameters: params ? this.createAqlParamsObject(params) : {}
    };
    return this.http.post(`${this.getApiUrl()}/query/csv`, aqlRequest, {headers: this.getHeaders(), responseType: 'blob' as 'json'});
  }

  getAqlQueryResultWithParametersAsXml(aql: string, params?: Map<string, string |number>): Observable<string> {
    let headers = new HttpHeaders();
    headers = headers.append('Accept', 'application/xml');
    const aqlRequest = {
      aql,
      aqlParameters: params ? this.createAqlParamsObject(params) : {}
    };
    return this.http.post(`${this.getApiUrl()}/query`, aqlRequest, {headers, responseType: 'text'});
  }

  getArchetypes(archetypes: string[]): Promise<any> {
    return this.http.get<any>(`${this.getApiUrl()}/archetype/flat?type=${archetypes.join('&type=')}`).toPromise();
  }

  getArchetypeDescription(archetypeId: string): Promise<any> {
    return this.http.get<any>(`${this.getApiUrl()}/archetype/flat/${archetypeId}?includeTemplates=true`).toPromise();
  }

  private createAqlParamsObject(params: Map<string, string | number>): any {
    const paramsObj = {};
    Array.from(params.keys()).forEach(k => {
      paramsObj[k] = params.get(k);
    });

    return paramsObj;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    //headers = headers.append('Expires', 'Mon, 01 Jan 1990 00:00:00 GMT');
    //headers = headers.append('Cache-Control', 'no-cache');
    //headers = headers.append('Pragma', 'no-cache');
    return headers;
  }

  getServerUrl(): string{
    return this.appContextService.getServerUrl();
  }

  getApiUrl(): string {
    return this.appContextService.getRestUrl();
  }

  getApiUrlwt(): string {
    return this.appContextService.getRestUrlwt();
  }

  private getAdminApiUrl(): string {
    return this.appContextService.getAdminRestUrl();
  }

  private addParents(tree: any): any {
    tree.children.forEach(child => {
      child.parentModel = tree;
      if (child.children) {
        this.addParents(child);
      }
    });
  }
}

