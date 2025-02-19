import {NgModule} from '@angular/core';

import {AnalysisRoutingModule} from './analysis-routing.module';
import {AnalysisComponent} from './analysis.component';
import {SharedModule} from '@shared/shared.module';


@NgModule({
  declarations: [AnalysisComponent],
  imports: [
    SharedModule,
    AnalysisRoutingModule
  ]
})
export class AnalysisModule {
}
