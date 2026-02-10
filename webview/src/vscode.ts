declare global {
  interface Window {
    acquireVsCodeApi?: () => { postMessage: (message: unknown) => void; getState: () => any; setState: (state: any) => void };
  }
}

export const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;
