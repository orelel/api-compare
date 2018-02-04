var express = require('express');
import { MainController } from '../controllers/main.controller';
var router = express.Router();

/* GET home page. */
router.get('/', MainController.getFinalResults);
router.get('/download', MainController.download);

module.exports = router;

