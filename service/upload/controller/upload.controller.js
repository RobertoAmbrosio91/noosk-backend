const CONSTANTS = require('../../../config/constant');
const util = require('../../../utils/response');
const message = require('../../../utils/messages.json');
const logger = require('./../../../config/winston');
const sanitizer = require("./../../../node_modules/sanitizer");
const upload = require('../../../utils/upload');
const helper = require('../../../utils/helper');
const fs = require('fs');
class uploadHandler {

  async uploadImage(request, response) {
    let fOrignalName = null;
    if (request.files && request.files.file) {
      fOrignalName = request.files.file.name;
      var file = fs.readFileSync(request.files.file.tempFilePath);
      file = "data:/" + request.files.file.mimetype + ";base64," + (file.toString('base64'));

    } else if (request.body.file && request.body.file != "") {
      var file = request.body.file;
      fOrignalName = request.body.name ? request.body.name : "";
    } else {
      return response.send(util.error("", message.required_parameters_null_or_missing));
    }
    let file_path = 'uploads/'+(request.body.module_key ? (request.body.module_key)+'/' : new Date().getTime());
    if (file != '') {
      try {
        
        const upload_data = await upload.uploadFile(file, file_path, fOrignalName);
        let resSend = util.success(upload_data, message.common_file_uploaded_success);
        
        response.send(resSend);
      } catch (error) {
        console.log(error, "error")
        response.status(200).send(util.error(error, message.error_message));
      }
    } else {
      response.send(util.error({}, message.required_parameters_null_or_missing));
    }
  }
}


module.exports = new uploadHandler();