﻿import { Controller } from 'stimulus'
import Uppy from '@uppy/core'
import FileInput from '@uppy/file-input'
import ProgressBar from '@uppy/progress-bar'
import AwsS3 from '@uppy/aws-s3'
import XHRUpload from '@uppy/xhr-upload'
import Swal from 'sweetalert2'

export default class extends Controller {
    static values = {
        fieldid: String,
        contenttype: String,
        usedirectuploadtocloud: Boolean,
        mimetypes: String,
        maxfilesize: Number
    }

    static targets = ['hidden', 'removeButton', 'uppyContainer', 'uppyProgress', 'uppyInfo', 'viewFile', 'uppyInfoObjectKey']

    connect() {
        this.uppy = new Uppy({
            id: this.fieldidValue,
            restrictions: {
                maxFileSize: this.maxfilesizeValue,
                maxNumberOfFiles: 1,
                allowedFileTypes: this.mimetypesValue.split(",")
            },
            autoProceed: true,
            allowMultipleUploads: false
        })

        this.uppy.use(FileInput, {
            target: `#${this.fieldidValue}-uppy`
        })

        this.uppy.use(ProgressBar, {
            target: `#${this.fieldidValue}-uppy-progress`,
            hideAfterFinish: false,
        })

        if (!this.usedirectuploadtocloudValue) {
            this.uppy.use(XHRUpload, {
                endpoint: `/raytha/media-items/${this.contenttypeValue}/upload`
            })
            this.uppy.on('upload-success', (file, response) => {
                const URL = `/raytha/media-items/objectkey/${response.body.fields.objectKey}`;
                this.hideChooseFiles();
                this.hiddenTarget.value = response.body.fields.objectKey;
                this.uppyInfoObjectKeyTarget.innerText = response.body.fields.objectKey;
                this.viewFileTarget.href = URL;
            })
        } else {
            this.uppy.use(AwsS3, {
                getUploadParameters: file => {
                    const URL = `/raytha/media-items/${this.contenttypeValue}/presign`;
                    return fetch(URL, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            filename: file.name,
                            contentType: file.type,
                            extension: file.extension
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        return {
                            method: 'PUT',
                            url: data.url,
                            fields: data.fields,
                            headers: {
                                'x-ms-blob-type': 'BlockBlob'
                            }
                        }
                    });
                }
            })
            this.uppy.on('upload-success', (file, response) => {
                console.log(response);
                const CREATE_MEDIA_ENDPOINT = `/raytha/media-items/${this.contenttypeValue}/create-after-upload`;

                //make post call
                fetch(CREATE_MEDIA_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type,
                        extension: file.extension,
                        id: file.meta.id,
                        objectKey: file.meta.objectKey,
                        length: file.size
                    })
                })
                .then(response => response.json())
                .then(data => {
                    const URL = `/raytha/media-items/objectkey/${file.meta.objectKey}`;
                    this.hideChooseFiles();
                    this.hiddenTarget.value = file.meta.objectKey;
                    this.uppyInfoObjectKeyTarget.innerText = file.meta.objectKey;
                    this.viewFileTarget.href = URL;
                });
            })
        }

        this.uppy.on('restriction-failed', (file, error) => {
            Swal.fire({
                title: "File Restriction",
                text: error,
                showConfirmButton: false,
                showCloseButton: true,
                showCancelButton: true,
                cancelButtonText: "OK",
                icon: "error"
            });
            this.clear();
        })

        this.uppy.on('upload-error', (file, error, response) => {
            console.log('error with file:', file.id)
            console.log('error message:', error)
            Swal.fire({
                title: "Upload failed",
                text: error,
                showConfirmButton: false,
                showCloseButton: true,
                showCancelButton: true,
                cancelButtonText: "OK",
                icon: "error"
            });
            this.clear();
        })

        if (this.hiddenTarget.value) {
            this.hideChooseFiles();
        } else {
            this.showChooseFiles();
        }
    }

    clear() {
        console.log("Clear all");
        this.uppy.cancelAll({ reason: 'user' });
        this.hiddenTarget.value = '';
        this.uppyInfoObjectKeyTarget.innerText = '';
        this.showChooseFiles();
    }

    hideChooseFiles() {
        this.uppyContainerTarget.hidden = true;
        this.uppyProgressTarget.hidden = true;
        this.uppyInfoTarget.hidden = false;
        this.removeButtonTarget.hidden = false;
    }

    showChooseFiles() {
        this.uppyContainerTarget.hidden = false;
        this.uppyProgressTarget.hidden = false;
        this.uppyInfoTarget.hidden = true;
        this.removeButtonTarget.hidden = true;
    }
}