var express = require('express');
import { MainController } from '../controllers/main.controller';
var router = express.Router();

/* GET home page. */
router.get('/', MainController.getFinalResults);

module.exports = router;

