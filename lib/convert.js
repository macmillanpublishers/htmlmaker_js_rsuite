'use strict';

var unzip = require("mammoth/lib/unzip");
var docxReader = require("mammoth/lib/docx/docx-reader");
var docxStyleMap = require("mammoth/lib/docx/style-map");
var cheerio = require("cheerio");

var htmlstyles = require("./htmlstyles");

var Convert = function (styleFunctionsPath) {
	if (styleFunctionsPath) {
		this.styleFunctions = require(styleFunctionsPath);
	}

	//Create the destination html document and setup some handles to the body, nav, current, and working tag list
	var $ = cheerio.load('<!DOCTYPE HTML><html xmlns="http://www.w3.org/1999/xhtml"><head></head><body data-type="book"></body></html>');
	this.document = $;
	this.head = $("head");
	this.body = $("body");
	this.current = this.body;
	this.working = [];

	this.nav = $('<nav><h1 class="toc-title">Table of Contents</h1></nav>');
	this.navList = $('<ol class="toc"></ol>');
	this.nav.append(this.navList);

	//Take the current docx w:p text and format it according to style information, then put it all into an array
	this.aggregateParaText = function (para) {
		var text = [];
		for (var i = 0; para.children && i < para.children.length; i++) {
			var child = para.children[i];
			var paraText = "";
			var isFootnote = false;
			for (var j = 0; child.children && j < child.children.length; j++) {
				var data = child.children[j];
				if (data.type == "text") {
					paraText += data.value;
				} else if (data.type == "noteReference") {
					paraText += data.noteId;
					isFootnote = true;
				}
			}

			if (child.styleId || child.isBold || child.isItalic || child.isUnderline && !para.styleId == 'ChapNumbercn') {
				var span = $("<span></span>");
				if (child.styleId) {
					span.addClass(child.styleId);
				}
				if (child.isBold) {
					span.css("font-weight", "bold");
				}
				if (child.isItalic) {
					span.css("font-style", "italic");
				}
				if (child.isUnderline) {
					span.css("text-decoration", "underline");
				}
				if (isFootnote == true && child.styleId !== "EndnoteReference") {
					span.addClass("FootnoteRef");
					var noteId = "footnote-" + data.noteId;
					span.attr('id', noteId)
				}
				span.text(paraText);
				text.push(span);
			} else {
				text.push(paraText);
			}
		}
		return text;
	};

};

module.exports = Convert;

// ADDED BY NELLIE FOR TESTIN
// Unzip the docx, then read the document.xml and style docs and feed them into the conversion.
Convert.prototype.getMammothHTML = function (docxPath, stylesJson) {
	var converter = this;
	var input = {path: docxPath};
	return unzip.openZip(input)
		.then(function (docxFile) {
			return docxReader.read(docxFile, input)
			  .then(function (parsedDoc) {
					return JSON.stringify(parsedDoc);
				});
		});
};
// END ADDED

// Unzip the docx, then read the document.xml and style docs and feed them into the conversion.
Convert.prototype.convertDocxToBookHTML = function (docxPath, stylesJson) {
	var converter = this;
	var input = {path: docxPath};
	return unzip.openZip(input)
		.then(function (docxFile) {
			return docxReader.read(docxFile, input)
				.then(function (parsedDoc) {
					return docxStyleMap.readStyleMap(docxFile)
						.then(function (docxStyles) {
							return converter.convertDocx(stylesJson, parsedDoc, docxStyles)
						});
				});
		});
};

Convert.prototype.convertDocx = function (stylesJson, docx, docxStyles) {
	var $ = this.document;
	var convert = this;
	var styles = new htmlstyles(stylesJson);

	function convertTitle(para) {
		var title = $("<title></title>");
		title.append(convert.aggregateParaText(para));
		convert.head.append(title);
		// insert the nav element
		convert.body.prepend(convert.nav);
		// add the required header info per HTMLBook spec
		var header = $("<header></header>");
		var booktitle = $("<h1></h1>");
		booktitle.append(convert.aggregateParaText(para));
		header.append(booktitle);
		convert.body.prepend(header);
	}

	//Run through each docx w:p definition and add it to the html document
	docx.value.children.forEach(function (para, index, paras) {
		if (para.styleId == styles["titleStyle"]["doc-style"]) {
			convertTitle(para);
		}
		if (para.type == "paragraph") {
			if (index > 0) {
				convert.convertDocxParagraph(para, styles, docxStyles, paras[index - 1]);
			} else {
				convert.convertDocxParagraph(para, styles, docxStyles);
			}
		} else {
			console.log(para.type);
		}
	});

  // add notes to the html document
  var notesjson = docx.value.notes._notes;
  var notesjsonarr = Object.keys(notesjson).map(function(k) { return notesjson[k] });
  var footnotesection = $("<section data-type='appendix' class='footnotes'></section>");
  var endnotesection = $("<section data-type='appendix' class='endnotes'></section>");
  // run through each note, convert it to paras, and append to notes section
  notesjsonarr.forEach(function (note, index, paras) {
  	if (note.noteType == "footnote") {
  		  var noteparent = $("<div class='footnote'></div>");
  		  noteparent.attr("data-noteref", note.noteId);
				note.body.forEach(function (para, index, paras) {
					var p = $("<span></span>");
					if (para.styleId) {
						p.addClass(para.styleId);
					}
					p.append(convert.aggregateParaText(para));
					noteparent.append(p);
				});
				footnotesection.append(noteparent);
		} else if (note.noteType == "endnote") {
  		  var noteparent = $("<div class='endnotetext'></div>");
  		  var endnoteid = "endnotetext-" + note.noteId;
  		  noteparent.attr("id", endnoteid);
				note.body.forEach(function (para, index, paras) {
					var p = $("<p></p>");
					if (para.styleId) {
						p.addClass(para.styleId);
					}
					p.append(convert.aggregateParaText(para));
					noteparent.append(p);
				});
				endnotesection.append(noteparent);
		} else {
			console.log(note.type);
		};
		convert.body.append(footnotesection);
		convert.body.append(endnotesection);
  });

  // INSERT ANY DOC POSTPROCESSING INSTRUX HERE

  // add extra endnote reference nesting
  $('span.EndnoteReference').each(function () {
  	var parentclass = $(this).parent().attr("class").toLowerCase();
  	var notenumber = $(this).contents();
  	var newid = "endnoteref-" + notenumber;
  	var childspan = $("<span class='endnotereference'></span>").attr("id", newid);
  	if (parentclass !== "endnotetext") {
	    $(this).contents().wrap(childspan);
    };
  });

  // if footnotes or endnotes sections are empty,
  // remove them
  $('section.footnotes:empty').remove();
  $('section.endnotes:empty').remove();

  $('.FMHeadNonprintingfmhnp:last-child, .BMHeadNonprintingbmhnp:last-child, .ChapTitleNonprintingctnp:last-child, .ChapTitlect:last-child').remove();
  // END POSTPROCESSING

	return this.document.html();
};

Convert.prototype.convertDocxParagraph = function (para, styles, docxStyles, prevPara) {
	var $ = this.document;
	var convert = this;
	var tags = styles.tagsForDocxStyle(para.styleId);

	if (!tags) {
		return;
	}

	//Functions that deal with behaviors defined in the style json file
	convert.behaviorFunctions = {
		"aggregate": function (tag, tagStyle, behavior) {
			if (!convert.current[0].name ||
				convert.current[0].name != tag["tag-name"] ||
				convert.current.attr("data-type") != tagStyle["data-type"]) {

				if (behavior["required-parent"]) {
					var parentFound = parentRequired(behavior);
					if (!parentFound) {
						throw new Error("Required parent not found for " + para.styleId);
					}
				}
				addHtmlToDoc(tag["tag-name"], {"name": "new-child"}, tagStyle);
			}
			var p = $("<p></p>");
			if (para.styleId) {
				p.addClass(para.styleId);
			}
			p.append(convert.aggregateParaText(para));
			convert.current.append(p);
		},
		"new-parent": function (htmlEl, behavior) {
			var parent = behavior["parent"];
			var parentStyle = styles.tagForRef(parent).dataTypeForDocxStyle(para.styleId);
			var parentEl = createElement(parent, parentStyle);
			parentEl.append(htmlEl);
			convert.working.pop();
			convert.behaviorFunctions["new-child"](parentEl);
		},
		"new-sibling": function (htmlEl) {
			convert.current.append(htmlEl);
		},
		"new-child": function (htmlEl) {
			if (convert.working.length) {
				convert.working[convert.working.length - 1].append(htmlEl);
			} else {
				convert.body.append(htmlEl);
			}
			convert.current = htmlEl;
			convert.working.push(htmlEl);
		}
	};

	function processHtmlEl(tag, tagStyle) {
		var behavior = determineBehavior(tagStyle["behavior"], para, prevPara);
		if (behavior["name"] == "aggregate") {
			convert.behaviorFunctions[behavior["name"]](tag, tagStyle, behavior);
			return;
		}
		addHtmlToDoc(tag["tag-name"], behavior, tagStyle);
	}

	// Create the html element and add it to the doc based on its style behavior
	// If there is no behavior defined, use new-sibling as a default
	function addHtmlToDoc(tagName, behavior, tagStyle) {
		var htmlEl = createElement(tagName, tagStyle);

		if (convert.behaviorFunctions[behavior["name"]]) {
			convert.behaviorFunctions[behavior["name"]](htmlEl, behavior);
		} else {
			convert.behaviorFunctions["new-sibling"](htmlEl);
		}
		if (convert.styleFunctions && convert.styleFunctions[tagStyle["function"]]) {
			convert.styleFunctions[tagStyle["function"]](htmlEl, convert, tagStyle, para, prevPara)
		}
		if (tagStyle["inner-text"]) {
			htmlEl.append(convert.aggregateParaText(para));
		}
	}

	function createElement(tagName, tagStyle) {
		var htmlEl = $("<" + tagName + " ></" + tagName + ">");
		if (para.styleId && tagName != "section" && tagName != "blockquote") {
			htmlEl.addClass(para.styleId);
		}
		if (tagStyle["data-type"] && tagStyle["data-type"] != "@default") {
			htmlEl.attr("data-type", tagStyle["data-type"]);
		}
		if (tagStyle["class"].length) {
			htmlEl.addClass(tagStyle["class"].join(" "));
		}
		tagStyle["attributes"].forEach(function (attribute) {
			htmlEl.attr(attribute["name"], attribute["value"]);
		});

		var id = Math.random().toString(36).substr(2, 9);
		id = "id" + id
		htmlEl.attr("id", id);

    // add numbering to list items that were auto-numbered in Word
		if (para.numbering) {
			htmlEl.addClass("autonumber");
			if (para.styleId != prevPara.styleId) {
				htmlEl.addClass("liststart");
			};
		};

    // OLD nav handling to insert nav before a user-defined element.
    // This has been changed so nav is inserted following header, always.
		// if(tagStyle["add-nav"]) {
		// 	convert.body.prepend(convert.nav);
		// }
		if(tagStyle["nav"]) {
			addNav(id);
		}

		return htmlEl;
	}

	function determineBehavior(behaviors, para, prevPara) {
		for (var i = 0; i < behaviors.length; i++) {
			var behavior = behaviors[i];
			switch (behavior["name"]) {
				case "aggregate":
					return behavior;
				case "new-sibling":
					if (behavior["required-sibling"]) {
						if (behavior["required-sibling"].indexOf(prevPara.styleId) > -1) {
							return behavior;
						}
					} else if (behavior["required-parent"]) {
						var parentFound = parentRequired(behavior);
						if (!parentFound) {
							throw new Error("Required parent not found for " + para.styleId);
						}
					} else {
						return behavior;
					}
				case "new-parent":
					if (behavior["required-parent"]) {
						var parentFound = parentRequired(behavior);
						if (!parentFound) {
							throw new Error("Required parent not found for " + para.styleId);
						}
					}
					return behavior;
				case "new-child":
					if (behavior["required-parent"]) {
						var parentFound = parentRequired(behavior);
						if (!parentFound) {
							throw new Error("Required parent not found for " + para.styleId);
						}
					}
					return behavior;
			}
		}
	}

	//Add a TOC li if this element has been defined as a 'nav' property in the style json file
	function addNav(id) {
		var li = $('<li></li>');
		li.addClass(para.styleId);
		var a = $('<a class="toc-link"></a>');
		li.append(a);
		a.text(convert.aggregateParaText(para).join(""));
		a.attr("href", "#" + id);
		convert.navList.append(li);
	}

	//Recursively look for the parent data-type or element name starting at the last working tag entry and then poping entires
	//off until we're at the body. Throw an error if we never found the parent.
	function parentRequired(behavior) {
		var requiredParentList = behavior["required-parent"];
		if (!convert.working.length) {
			convert.current = convert.body;
			return requiredParentList.indexOf("body") > -1 || requiredParentList.indexOf("book") > -1
		}
		var lastWorking = convert.working[convert.working.length - 1];
		if (requiredParentList.indexOf(lastWorking.attr("data-type")) > -1 || requiredParentList.indexOf(lastWorking[0].name) > -1) {
			convert.current = lastWorking;
			return true;
		} else {
			convert.working.pop();
			return parentRequired(behavior);
		}
	};

	tags.forEach(function (tag) {
		var tagStyle = tag.dataTypeForDocxStyle(para.styleId);
		processHtmlEl(tag, tagStyle);
	});
};
