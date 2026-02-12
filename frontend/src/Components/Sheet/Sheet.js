/*
	This file needs to be rewritten soon due to being not properly readable anymore
*/

import React, { Fragment, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

import { Document, pdfjs, Page } from "react-pdf";

import SideBar from "../Sidebar/SideBar";
import "./Sheet.css";

import axios from "axios";

/* Utils */
import {
  displayTimeAsString,
  findSheetByPages,
  findComposerByPages,
  findSheetBySheets,
  findComposerByComposers,
  getCompImgUrl,
} from "../../Utils/utils";

/* Redux stuff */
import { connect } from "react-redux";
import { store } from "../../Redux/store";
import { logoutUser } from "../../Redux/Actions/userActions";
import {
  getComposerPage,
  getSheetPage,
  setSheetPage,
  setComposerPage,
} from "../../Redux/Actions/dataActions";
import { useHistory } from "react-router-dom";

import Modal from "../Sidebar/Modal/Modal";
import ModalContent from "./Components/ModalContent";
import InformationCard from "./Components/InformationCard";
import MusicXMLDisplay from "./Components/MusicXMLDisplay";

/* Activate global worker for displaying the pdf properly */
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

function Sheet({
  sheetPages,
  composerPages,
  sheets,
  composers,
  sheetPage,
  getSheetPage,
  totalSheetPages,
  setSheetPage,
  getComposerPage,
  composerPage,
  totalComposerPages,
  setComposerPage,
}) {
  /* PDF Page width rendering */
  const windowHeight = 840;

  const [fileData, setFileData] = useState(undefined);
  const [sheet, setSheet] = useState(undefined);
  const [composer, setComposer] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setDesktop] = useState(window.innerHeight > windowHeight);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const updateMedia = () => {
    setDesktop(window.innerHeight > windowHeight);
    setIsMobile(window.innerWidth < 768);
  };

  useEffect(() => {
    // Change Page Title
    if (sheet && sheet.sheet_name) {
      document.title = `SheetAble - ${sheet.sheet_name}`;
    } else {
      document.title = `SheetAble - Sheet`;
    }

    window.addEventListener("resize", updateMedia);

    return () => window.removeEventListener("resize", updateMedia);
  }, [sheet]);

  let { safeSheetName, safeComposerName } = useParams();

  useEffect(() => {
    const foundSheet = findSheetByPages(safeSheetName, sheetPages) || findSheetBySheets(safeSheetName, sheets);
    const foundComposer = findComposerByPages(safeComposerName, composerPages) || findComposerByComposers(safeComposerName, composers);

    if (foundSheet && foundComposer) {
      setSheet(foundSheet);
      setComposer(foundComposer);
      setLoading(false);
    } else {
      // Data not in Redux yet, fetch it
      fetchData();
    }
  }, [safeSheetName, safeComposerName, sheetPages, sheets, composerPages, composers]);

  const fetchData = () => {
    axios
      .get(`/sheet/${safeSheetName}`)
      .then((res) => {
        setSheet(res.data);
        return axios.get(`/composer/${safeComposerName}`);
      })
      .then((res) => {
        setComposer(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch data:", err);
      });
  };

  const fileRequest = () => {
    if (!safeComposerName || !safeSheetName) return;
    axios
      .get(`/sheet/file/${safeComposerName}/${safeSheetName}`, {
        responseType: "arraybuffer",
      })
      .then((res) => {
        setFileData(res);
      })
      .catch((err) => {
        if (err.response && err.response.status === 401) {
          store.dispatch(logoutUser());
          window.location.href = "/login";
        }
        if (err.response && err.response.status === 404) {
          window.location.href = "/";
        }
      });
    return fileData;
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset) {
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  }

  function previousPage(e) {
    e.target.blur();
    changePage(-1);
  }

  function nextPage(e) {
    e.target.blur();
    changePage(1);
  }

  const documentRef = useRef(null);

  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFullScreen) return;
      
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      } else if (e.key === 'ArrowRight') {
        if (documentRef.current) {
          documentRef.current.scrollBy({ left: window.innerWidth * 0.45, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowLeft') {
         if (documentRef.current) {
          documentRef.current.scrollBy({ left: -(window.innerWidth * 0.45), behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen]);

  const fullScreenStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    minWidth: '100vw',
    height: '100vh',
    zIndex: 9999,
    backgroundColor: '#333',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    overflowX: isMobile ? 'hidden' : 'auto',
    overflowY: isMobile ? 'auto' : 'hidden', // Lock vertical on desktop
    padding: isMobile ? '20px' : '0 20px', 
  };

  let history = useHistory();

  const [fileDownloadData, setFileDownloadData] = useState({
    link: "",
    name: "",
  });

  // Helper to check extension
  const isMusicXml = (sheet) => {
      if (!sheet || !sheet.extension) return false;
      const ext = sheet.extension.toLowerCase();
      return ext === '.xml' || ext === '.mxl' || ext === '.musicxml';
  }

  function saveByteArray(reportName, byte) {
    const type = isMusicXml(sheet) ? "text/xml" : "application/pdf";
    var blob = new Blob([byte], { type: type });
    setFileDownloadData({
      ...fileDownloadData,
      link: window.URL.createObjectURL(blob),
      name: reportName,
    });
  }

  const [copyText, setCopyText] = useState("Click to Copy");

  const handleClick = () => {
    navigator.clipboard.writeText(window.location.href).then(()=>{
      setCopyText("Copied ✓")
    }).catch(()=>{
      setCopyText("Click to Copy")
    });
  };

  const [editModal, setEditModal] = useState(false);

  if (loading || !sheet || !composer) {
    return (
      <Fragment>
        <SideBar />
        <div className="home_content">
          <h1>Loading...</h1>
        </div>
      </Fragment>
    );
  }

  const imgUrl = getCompImgUrl(composer.portrait_url);

  return (
    <Fragment>
      <SideBar />
      <div className="home_content">
        <div className="document_container">
          <div className="doc_wrapper">
            <div className="doc_header">
              <span className="doc_sheet">{sheet.sheet_name}</span>
              <br />
              <span className="doc_composer">{sheet.composer}</span>
            </div>

            <div className="noselect document">
              {sheet && isMusicXml(sheet) ? (
                 <MusicXMLDisplay 
                    fileUrl={`/sheet/file/${safeComposerName}/${safeSheetName}${sheet.extension}`}
                    fileName={sheet.sheet_name}
                    width={isDesktop ? 750 : 550}
                 />
              ) : (
                  <div ref={documentRef} style={isFullScreen ? { ...fullScreenStyles } : { position: 'relative' }}>
                    <button 
                      onClick={toggleFullScreen}
                      style={isFullScreen ? {
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 10000,
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '5px 10px',
                        cursor: 'pointer'
                      } : {
                        position: 'absolute',
                        top: '10px',
                        right: '40px',
                        zIndex: 10000,
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '5px 10px',
                        cursor: 'pointer'
                      }}
                    >
                      ⛶
                    </button>
                    <Document
                      file={fileData === undefined ? fileRequest() : fileData}
                      onLoadSuccess={onDocumentLoadSuccess}
                    >
                      {isFullScreen ? (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: isMobile ? 'column' : 'row', 
                          height: '100%', 
                          minWidth: isMobile ? '100%' : 'min-content',
                          justifyContent: isMobile ? 'flex-start' : 'center',
                          alignItems: 'center'
                        }}>
                          {Array.from(new Array(numPages), (el, index) => (
                            <div 
                              key={`page_${index + 1}`} 
                              style={{ 
                                marginRight: isMobile ? '0' : '20px', 
                                marginBottom: isMobile ? '20px' : '0',
                                display: 'flex', 
                                flexShrink: 0, 
                                justifyContent: 'center', 
                                alignItems: 'center' 
                              }}
                            >
                              <Page 
                                pageNumber={index + 1} 
                                height={!isMobile ? window.innerHeight - 40 : undefined}
                                width={isMobile ? window.innerWidth * 0.9 : undefined} 
                                renderAnnotationLayer={false}
                                className="pdf-page-full"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Page 
                          pageNumber={pageNumber} 
                          width={isDesktop ? 650 : 550}
                          renderAnnotationLayer={false}
                        />
                      )}
                    </Document>
                  </div>
              )}
            </div>

            {!isMusicXml(sheet) && (
            <div className="page_controls">
              <button
                type="button"
                disabled={pageNumber === 1}
                onClick={previousPage}
              >
                &lt;
              </button>
              <span>
                {pageNumber} of {numPages}
              </span>
              <button
                type="button"
                disabled={pageNumber === numPages}
                onClick={nextPage}
              >
                &gt;
              </button>
            </div>
            )}
          </div>

          <div className="right_side_doc">
            <div className="doc_box sheet_info">
              <span className="sheet_info_header">{sheet.sheet_name}</span>
              <div>
                <span className="bold sheet_info_info">Release Date:</span>
                <span className="sheet_info_info">
                  {" "}
                  {displayTimeAsString(sheet.ReleaseDate)}
                </span>
              </div>
              <div>
                <span className="bold sheet_info_info">Uploaded At:</span>
                <span className="sheet_info_info">
                  {" "}
                  {displayTimeAsString(sheet.created_at)}
                </span>
              </div>
              <div>
                <span className="bold sheet_info_info">Uploaded By:</span>
                <span className="sheet_info_info"> {sheet.uploader_id}</span>
              </div>

              <div className="tooltip">
                <button className="sheet_info_button" onClick={handleClick}>
                  Share
                </button>
                <span className="tooltiptext">{copyText}</span>
              </div>

              <div className="under_box">
                <a
                  href={fileDownloadData.link}
                  download={fileDownloadData.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button
                    className="remove_shadow"
                    onClick={() => saveByteArray(sheet.sheet_name, fileData.data)}
                  >
                    Download
                  </button>
                </a>

                <button
                  className="remove_shadow last-button"
                  onClick={setEditModal}
                >
                  Edit
                </button>
                <Modal
                  title="Edit"
                  onClose={() => setEditModal(false)}
                  show={editModal}
                >
                  <ModalContent
                    onClose={() => setEditModal(false)}
                    uploadFile={fileData}
                    sheet={sheet}
                  />
                </Modal>
              </div>
            </div>

            <div
              className="doc_box composer_info remove_shadow"
              onClick={() => history.push(`/composer/${composer.safe_name}`)}
            >
              <img className="composer_img" src={imgUrl} alt="Portrait" />
              <div className="composer_info_text_wrapper">
                <span>{composer.name}</span>
                <span>{composer.epoch}</span>
              </div>
            </div>
            {isDesktop && <hr className="sep_video" />}

            <InformationCard
              infoText={sheet.information_text}
              tags={sheet.tags}
              sheetName={sheet.safe_sheet_name}
            />
          </div>
        </div>
      </div>
    </Fragment>
  );
}

const mapStateToProps = (state) => ({
  sheetPages: state.data.sheetPages,
  composerPages: state.data.composerPages,
  sheets: state.data.sheets,
  composers: state.data.composers,
  sheetPage: state.data.sheetPage,
  totalSheetPages: state.data.totalSheetPages,
  composerPage: state.data.composerPage,
  totalComposerPages: state.data.totalComposerPages,
});

const mapActionsToProps = {
  getSheetPage,
  setSheetPage,
  getComposerPage,
  setComposerPage,
};

export default connect(mapStateToProps, mapActionsToProps)(Sheet);
