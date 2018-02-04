import * as fs from 'fs';
import * as _ from 'lodash';
const Aigle = require('aigle');
Aigle.mixin(_);
import * as ConfigValidation from './config-validation';
const request = require('async-request');
const path = require('path');
const configFilePath = path.join(__dirname, '../config.json');
export const resultFilePath = path.join(__dirname, '../results.json');
const jsondiffpatch = require('jsondiffpatch');



export function loadFile(file, name?: string) {
    if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'UTF-8'));
    }
    throw Error(`${name} file doesn't exist!`);

}

async function getJsonResponseByUrl(hosts: Array<string>, url: string, ivUser: string, method?: string) {
    
    const responses = await Aigle.map(hosts, async host => {
        const response = await request(`${host}/${url}`, {
            method: method || 'GET',
            headers: {
                'iv-user': ivUser
            },
        });
    
        if (response.statusCode > 300) {
            throw Error(response.body)
        }
    
        try {
            const result = JSON.parse(response.body);
            return result;
        }
        catch (err) {
            throw Error(response.body);
        }
    });

    return responses;
}


function extractArrayFromResponse(response, dotNotation) {
    if (!Array.isArray(response) && dotNotation) {
        const extractedArray = dotNotation.split('.').reduce((o, i) => o[i], response);
        if(!Array.isArray(extractedArray)){
            throw Error('Unable to extract array from data, maybe data_array_path value in config file is wrong?')
        }
        return extractedArray;
    }
    return response;
}

function omitFields(responseArray, fileldsNameArray){
    return responseArray.map(record => _.omit(record, fileldsNameArray || []));
}

async function getApisDiff(config) {
    const rethinkServer = config['rethinkdb-server'],
        mongoServer = config['mongodb-server'],
        ivUser = config['iv-user'],
        apis = config.apis,
        final = await Aigle.map(apis, async api => {

            let success = true,
                error,
                delta,
                html,
                rethinkResponse,
                mongoResponse;

            try {
                const serverResponses = await getJsonResponseByUrl([rethinkServer, mongoServer], api.url, ivUser);                

                [rethinkResponse,mongoResponse] = serverResponses.map(reposnse => {
                    const extractedResponse = extractArrayFromResponse(reposnse, api.data_array_path);
                    const responseOmitted =  omitFields(extractedResponse, api.fields_to_ignore);
                    
                    return responseOmitted;
                })              


                delta = jsondiffpatch.diff(rethinkResponse, mongoResponse);
                html = jsondiffpatch.formatters.html.format(delta, rethinkResponse);
            }
            catch (err) {
                success = false;
                error = err.message
            }


            return {
                success: success,
                response: {
                    mongo: mongoResponse,
                    rethink: rethinkResponse
                },
                error: error,
                diff: delta,
                html: html,
                title: api.name
            }

        });

    return {
        timestamp: new Date(),
        results: final
    };
}

function validateConfig(config) {
    return ConfigValidation.validate(config);
}

function saveResultsToFile(content) {
    fs.writeFileSync(resultFilePath, JSON.stringify(content), 'utf8');
    return content;
}

function printResults(content) {
    const successFilter = (isSuccess) => record => record.success === isSuccess; 
    const htmlFilter = (isEmpty) => isEmpty ? record => record.html === '' : record => record.html && record.html !== ''; 
    const errorFilter = record => record.error === true; 
    const apiFilteredByName = (filterFn) => content.results
        .filter(filterFn)
        .map(record => record.title)
        .join(',') || '-';

    console.info(`\n***********************************************`);
    console.info(`The following apis succeed: ${apiFilteredByName(successFilter(true))}`);
    console.info(`The following apis failed to retrive: ${apiFilteredByName(successFilter(false))}`);
    console.info(`The following apis failed in process: ${apiFilteredByName(errorFilter)}`);
    console.info(`The following apis failed by diff: ${apiFilteredByName(htmlFilter(false))}`);
    console.info(`The following apis passed by diff: ${apiFilteredByName(htmlFilter(true))}`);
    console.info(`**********************************************\n`);
    console.info(`You can see full report in: http://localhost:3000`);
    
}



export const start = async () => {
    console.info(`> Starting api compare app`);
    const getConfigAndValidate = _.flow([
        loadFile,
        validateConfig
    ]);

    const handleResult = _.flow([
        saveResultsToFile,
        printResults
    ]);
    console.info(`> Loading config file`);
    const config = getConfigAndValidate(configFilePath);
    console.info(`> Config file loaded successfuly`);
    console.info(`> Config file validation passed`);
    console.info(`> Starting api diff`);
    const results = await getApisDiff(config)
    console.info(`> Priniting results`);
    handleResult(results);

}


