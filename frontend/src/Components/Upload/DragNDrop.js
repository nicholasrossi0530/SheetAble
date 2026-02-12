import React from "react";

// Import React FilePond
import { FilePond, registerPlugin } from "react-filepond";

// Import the plugin code
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";

// Import FilePond styles
import "filepond/dist/filepond.min.css";

// Redux Imports
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { uploadSheet } from "../../Redux/Actions/dataActions";

registerPlugin(FilePondPluginFileValidateType);

function DragNDrop({
  giveModalData,
  requestData,
  uploadSheet,
  secondButtonOnClick,
}) {
  //const [files, setFiles] = useState(undefined)

  const uploadFinish = (files) => {
    if (files.length > 0) {
      const file = files[0].file;
      // Modal context
      if (giveModalData) {
        giveModalData(file);
      }

      // UploadPage context
      if (secondButtonOnClick && requestData) {
        const data = {
          ...requestData,
          uploadFile: file,
        };

        uploadSheet(data, () => {
          secondButtonOnClick({ preventDefault: () => {} });
        });
      }
    }
  };

  const removeFile = () => {
    if (giveModalData) giveModalData(undefined);
  };

  return (
    <div className="upload-container">
      <FilePond
        onupdatefiles={(files) => {
          uploadFinish(files);
        }}
        onremovefile={removeFile}
        allowMultiple={false}
        server={{
          process: (
            fieldName,
            file,
            metadata,
            load,
            error,
            progress,
            abort,
            transfer,
            options
          ) => {
            load();
          },
        }}
        maxFiles={1}
        name="files"
        labelIdle='Drag & Drop your file or <span class="filepond--label-action">Browse</span>'
        credits={false}
        allowFileTypeValidation={false}
        acceptedFileTypes={[
          ".pdf",
          ".xml",
          ".mxl",
          ".musicxml",
          "application/pdf",
          "application/xml",
          "text/xml",
          "application/vnd.recordare.musicxml+xml",
          "application/vnd.recordare.musicxml",
        ]}
      />
    </div>
  );
}

DragNDrop.propTypes = {
  uploadSheet: PropTypes.func.isRequired,
};

const mapActionsToProps = {
  uploadSheet,
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps, mapActionsToProps)(DragNDrop);
