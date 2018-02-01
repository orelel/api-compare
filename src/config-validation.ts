const Joi = require('joi');

const configSchema = Joi.object().keys({
    'rethinkdb-server': Joi.string().uri().required(),
    'mongodb-server': Joi.string().uri().required(),
    'iv-user': Joi.string().required(),
    'apis': Joi.array().items(Joi.object().keys({
        name: Joi.string().required(),
        url: Joi.string().uri({
            relativeOnly: true
        }).required(),
        fields_to_ignore: Joi.array().items(Joi.string()).optional(),
        method: Joi.string().optional(),
        data_array_path: Joi.string().optional()
    }))
})

export function validate(json){
    const result = Joi.validate(json, configSchema, {
        allowUnknown: true,
        stripUnknown: true
    });

    if(result.error){
        throw result.error;
    }

    return result.value;



}