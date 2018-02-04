const jsondiffpatch = require('jsondiffpatch');
const fs = require('fs');
import * as MainApp from '../../src/main';

export class MainController {
    public static getFinalResults(req: any, res: any, next: any) {
        
        try {
            const jsonResult = MainApp.loadFile(MainApp.resultFilePath);
            res.render('index', { title: 'Final Report', uiResult: jsonResult });
        }
        catch (err) {
            res.render('error', {message: 'result file not found', status:500});
        }        
    }

    public static download(req: any, res: any, next: any){
        const file = MainApp.resultFilePath;        
        res.download(file); // Set disposition and send it.
    }
}