import { ActionReducerMap } from "@ngrx/store";
import { LayoutState, layoutReducer } from "./layouts/layout-reducers";
import { FileManagerReducer, FileManagerState } from "./File Manager/filemanager_reducer";
// import { authenticationReducer, AuthenticationState } from "./Authentication/authentication.reducer";

export interface RootReducerState {
    layout: LayoutState;
    FileManager: FileManagerState;
    // authentication: AuthenticationState;
}

export const rootReducer: ActionReducerMap<RootReducerState> = {
    layout: layoutReducer,
    FileManager: FileManagerReducer,
    // authentication: authenticationReducer,

}