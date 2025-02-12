var uploading = 0;

if (typeof (onUploadFinished) === 'undefined') {
	console.log("define");
	onUploadFinished = function (file) { };
}

$(document).ready(function () {
	console.log("ready");
	createEditor($("textarea.editor"), tinymceSettings);

	$("select.teammembers.ajax-autocomplete").on('chosen:showing_dropdown', function () {
		const $select = $(this);

		if ($select.data('loaded')) return;

		const url = $select.data('url');
		const ownerId = $select.data('ownerid'); 

		$.get(url, function (data) {
			const authors = data.authors;

			if (!authors) return;

			authors.forEach(function (author) {
				const currentUserIds = $select.find('option:selected').map(function () { return Number($(this).val()); }).get();

				if (
					(currentUserIds.includes(author.userid)) ||
					(author.userid == ownerId)
				) {
					return;
				}

				$select.append($('<option>', {
					value: author.userid,
					text: author.name
				}));
			});

			$select.trigger("chosen:updated");
			$select.data('loaded', true);
		});
	});

	$("a[href='#addconnection']").click(function () {
		var $elem = $(".connection.template").clone();
		$elem.removeClass("template");

		$(".connections").append($elem);
		$("select", $elem).chosen({ placeholder_text_multiple: " " });

		return false;
	});

	$(document).on("click", ".file .delete", function () {
		var $self = $(this);
		var filename = $(this).parent().find(".filename").text();
		var fileid = $(this).attr("data-fileid");

		if ($self.parent().hasClass("error")) {
			$self.parent().remove();
			return false;
		}

		if (confirm("Really delete " + filename + "?")) {
			$(".okmessagepopup").html(filename + " deleted.");
			$.post("/edit-deletefile", { fileid: fileid, at: actiontoken }).done(function () {
				showOkMessage();
				$self.parent().remove();
			});
		}

		return false;
	});

	$(document).on("click", ".connection .delete", function () {
		$(this).parent().remove();
		return false;
	});

	$(".edit-asset .connection select[name='toassetid[]']").each(function () {
		var $elem = $("select[name='assettypeid[]']", $(this).parent());

		$(this).next().click(function () {
			if ($(this).data("loaded") == 1) return;
			loadAssets($elem);
			$(this).data("loaded", 1);
		});


	});

	$(document).on("change", ".connection select[name='assettypeid[]']", function () {
		loadAssets($(this));
	});


	$(document).filedrop({
		url: '/edit-uploadfile',
		paramname: 'file',
		data: {
			upload: 1,
			assetid: assetid,
			assettypeid: assettypeid
		},
		error: function (err, file) {
			switch (err) {
				case 'BrowserNotSupported':
					//alert('browser does not support HTML5 drag and drop')
					break;
				case 'TooManyFiles':
					// user uploaded more than 'maxfiles'
					alert('too many files')
					break;
				case 'FileTooLarge':
					// program encountered a file whose size is greater than 'maxfilesize'
					// FileTooLarge also has access to the file which was too large
					// use file.name to reference the filename of the culprit file
					alert('file too large')
					break;
				case 'FileTypeNotAllowed':
					// The file type is not in the specified list 'allowedimporttypes'
					alert('not allowed file type')
					break;
				case 'FileExtensionNotAllowed':
					// The file extension is not in the specified list 'allowedfileextensions'
					alert('not allowed file extension')
					break;
				default:
					break;
			}
		},
		allowedimporttypes: [],   // importtypes allowed by Content-Type.  Empty array means no restrictions
		allowedfileextensions: [], // file extensions allowed. Empty array means no restrictions
		maxfiles: 100,
		maxfilesize: 200,    // max file size in MBs

		dragOver: function () {
			// user dragging files over #dropzone
		},
		dragLeave: function () {
			// user dragging files out of #dropzone
		},
		docOver: function () {
			// user dragging files anywhere inside the browser document window
		},
		docLeave: function () {
			// user dragging files out of the browser document window
		},
		drop: function () {
			// user drops file
			//console.log("dropped");

			return true;
		},
		uploadStarted: function (i, file, len) {
			// a file began uploading
			// i = index => 0, 1, 2, 3, 4 etc
			// file is the actual file of the index
			// len = total files user dropped
			//console.log("started");
			uploading++;

			var parts = file.name.split('.');
			var ending = parts[parts.length - 1];

			$elem = $(".file.template").clone();
			$elem.removeClass("template");
			$elem.attr("data-filename", file.name);

			$(".filename", $elem).html(file.name);
			$(".fi", $elem).addClass("fi-" + ending);
			$(".fi-content", $elem).html(ending);
			$(".uploadprogress", $elem).html("0%");

			$(".files").append($elem);
		},
		uploadFinished: function (i, file, response, time) {
			$elem = $(".file[data-filename='" + file.name + "']");

			if (response.status != "ok") {
				$(".filename", $elem).html("Unable to upload file.<br>" + response.errormessage).addClass("text-error");
				$elem.addClass("error");
			}

			if (response.thumbnailfilepath) {
				$(".fi", $elem).remove();
				$("img", $elem).attr("src", response.thumbnailfilepath).show();
			}

			$("input", $elem).val(response.fileid);
			$(".uploadprogress", $elem).hide();
			$elem.append("<a href=\"#\" class=\"delete\" data-fileid=\"" + response.fileid + "\"></a>");
			$(".uploaddate", $elem).html(response.uploaddate);

			onUploadFinished(response);
		},
		progressUpdated: function (i, file, progress) {
			// this function is used for large files and updates intermittently
			// progress is the integer value of file being uploaded percentage to completion

			$elem = $(".file[data-filename='" + file.name + "']");
			$(".uploadprogress", $elem).html(progress + "%");
		},
		globalProgressUpdated: function (progress) {
			// progress for all the files uploaded on the current instance (percentage)
			// ex: $('#progress div').width(progress+"%");
		},
		speedUpdated: function (i, file, speed) {
			// speed in kb/s
		},
		rename: function (name) {
			// name in string format
			// must return alternate name as string
		},
		beforeEach: function (file) {
			// file is a file object
			// return false to cancel upload
		},
		beforeSend: function (file, i, done) {
			// file is a file object
			// i is the file index
			// call done() to start the upload
			done();
		},
		afterAll: function () {
			// runs after all files have been uploaded or otherwise dealt with
		}
	});

});





function loadAssets($self) {
	$.get('/get-assetlist', { assettypeid: $self.val() }, function (data) {
		var jsondata = $.parseJSON(data);

		var $elem = $self.parents('.connection');

		var $select = $("select[name='toassetid[]']", $elem);
		$select.html("");

		jsondata.assets.forEach(function (asset) {
			$select.append($('<option value="' + asset.assetid + '">' + asset.name + '</option>'));
		});

		$select.trigger("chosen:updated");
	});
}


function submitForm(returntolist) {
	var good = true;
	$(".required").each(function () {
		if ($(this).parents(".template").length != 0 || $(this)[0].hasAttribute('disabled')) return;

		if (!$(this).val()) {
			$(this).addClass("bg-error");
			good = false;
		}
	});

	$('form[name=form1]').trigger('reinitialize.areYouSure');

	if (!good) {
		alert("Please fill in all required fields");
		return;
	}


	if (returntolist) {
		$('input[name="saveandback"]').val(1);
	}
	document['form1'].submit();
}

function submitDelete() {
	var cf = prompt("Really delete this entry? Type DELETE to confirm");
	if (cf == "DELETE") {
		document['deleteform'].submit();
	}
}


