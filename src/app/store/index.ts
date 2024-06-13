import { ActionReducerMap } from "@ngrx/store";
import { LayoutState, layoutReducer } from "./layouts/layout-reducers";
import { EcommerceState, ecommercerReducer } from "./Ecommerce/ecommerce_reducer";
import { ProjectReducer, ProjectState } from "./Project/project_reducer";
import { InvoiceReducer, InvoiceState } from "./Invoice/invoice_reducer";
import { FileManagerReducer, FileManagerState } from "./File Manager/filemanager_reducer";
import { TodoReducer, TodoState } from "./Todo/todo_reducer";
import { ApplicationReducer, ApplicationState } from "./Jobs/jobs_reducer";
import { ApikeyReducer, ApikeyState } from "./APIKey/apikey_reducer";
// import { authenticationReducer, AuthenticationState } from "./Authentication/authentication.reducer";

export interface RootReducerState {
    layout: LayoutState;
    Ecommerce: EcommerceState;
    Project: ProjectState;
    Invoice: InvoiceState;
    FileManager: FileManagerState;
    Todo: TodoState;
    Jobs: ApplicationState;
    APIKey: ApikeyState;
    // authentication: AuthenticationState;
}

export const rootReducer: ActionReducerMap<RootReducerState> = {
    layout: layoutReducer,
    Ecommerce: ecommercerReducer,
    Project: ProjectReducer,
    Invoice: InvoiceReducer,
    FileManager: FileManagerReducer,
    Todo: TodoReducer,
    Jobs: ApplicationReducer,
    APIKey: ApikeyReducer,
    // authentication: authenticationReducer,

}