'use strict';

var unzip = require("mammoth/lib/unzip");
var docxReader = require("mammoth/lib/docx/docx-reader");
var docxStyleMap = require("mammoth/lib/docx/style-map");
var cheerio = require("cheerio");

var htmlstyles = require("./htmlstyles");

// adding in this bit to strip possible trailing zeros from stylename
function stripTrailingZero(stylename) {
	if (stylename.substr(-1) == "0") {
		stylename = stylename.substring(0, stylename.length - 1);
	}
	return stylename;
}

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
			var isNoteWithCustomMark = false;
			var isLineBreak = false;
			var isWordHyperlink = false;
			var isLegacyWordHyperlink = false;
			for (var j = 0; child.children && j < child.children.length; j++) {
				var data = child.children[j];
				if (data.type == "text") {
					// \/ Custom marks are handled later, where we split the run's text from the Id, and tag separately
					if (isNoteWithCustomMark == true) {
						continue;
					}
					// this prevents bug WDV-245: left angle brackets directly followed by text in a run
					//   getting mis-interpreted as html tags.
					// the addclass function for styled runs (below) resolves this issue on its own; if we replace
					//   these angle brackets for those runs the &lt; encodings are interpreted as text instead oxtf encodings
					//   hence the conditional
					if (child.styleId || child.isBold || child.isItalic || child.isUnderline && !para.styleId == 'ChapNumbercn') {
						paraText += data.value;
					} else {
						paraText += data.value.replace(/</g,'&lt;');
					}
				} else if (data.type == "noteReference") {
					isFootnote = true;
					// \/ This test captures notes with custom text markers (like manually entered asterisks)
					//  Custom 'symbol' marks are ignored by mammoth?
					if (child.children[1]) {
						isNoteWithCustomMark = true;
					} else {
						paraText += data.noteId;
					}
				} else if (data.type == "break" && data.breakType == "line") {
					isLineBreak = true;
				} else if (child.type === "hyperlink") {
					isWordHyperlink = true;
				// discovered working on wdv-315: legacy hyperlinks were represented via <w:fldChar> tags spanning several w:r's instead of a single
				//  w:hyperlink element. Even in re-saved Word docx, when a hyperlink is inisitally created and saved; it can result in the link
				//  initially being encoded as such and the text of the link getting dropped, if we don't make provision for it.
				} else if (data.type === "hyperlink") {
					if (data.children.length) {
						isLegacyWordHyperlink = true;
					}
				} else {
					if (data.type == "break") {
						console.log('unhandled break-type -- child.type: "' + child.type + '", data.breakType: "' + data.breakType + '"');
					} else {
						console.log('unhandled item-- child.type: "' + child.type + '", data.type: "' + data.type + '"');
					}
				}
			}
			// we don't want to rm content at this stage.
			//  so we wrap custom note marks in their own class so we can hide/rm during htmltohtmlbook.js (or use at a later date)
			if (isNoteWithCustomMark) {
					var span_marker = $("<span></span>").addClass("custom_note_mark").text(child.children[1].value);
					var span_id = $("<span></span>")
				if (child.styleId) {
					span_id.addClass(child.styleId);
				} else if (child.children[0].noteType == "endnote") {
					span_id.addClass("EndnoteReference");
				} else if (child.children[0].noteType == "footnote") {
					span_id.addClass("FootnoteReference");
				}
				if (child.children[0].noteType == "footnote") {
					span_id.addClass("FootnoteRef");
					var noteId = "footnote_" + child.children[0].noteId;
					span_id.attr('id', noteId);
				}
				span_id.text(child.children[0].noteId);
				text.push(span_marker);
				text.push(span_id);
			}
			else if (isLegacyWordHyperlink == true) {
				if (data.children.length){
					var linkurl = data.href;
					var linktext = data.children[0].value;
					var link = $("<a></a>").attr('href', linkurl).text(linktext);
					var span = $("<span></span>").addClass("Hyperlink");
					span.append(link);
					text.push(span);
				}
			} else if (child.styleId || child.isBold || child.isItalic || child.isUnderline && !para.styleId == 'ChapNumbercn') {
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
					var noteId = "footnote_" + data.noteId;
					span.attr('id', noteId);
				}
				span.text(paraText);
				text.push(span);
			// in testing, noticed that an unstyled note could go untagged... this remedies that
			} else if (isFootnote == true) {
				var span = $("<span></span>")
				if (child.children[0].noteType == "endnote") {
					span.addClass("EndnoteReference")
				} else if (child.children[0].noteType == "footnote") {
					span.addClass("FootnoteRef FootnoteReference")
					var noteId = "footnote_" + data.noteId;
					span.attr('id', noteId);
				}
				span.text(paraText);
				text.push(span);
			} else if (isLineBreak == true) {
				var br = $("<br/>");
				text.push(br);
				text.push(paraText);
			} else if (isWordHyperlink == true) {
				var linkurl = child.href;
				var linktext = data.children[0].value;
				var link = $("<a></a>").attr('href', linkurl).text(linktext);
				var span = $("<span></span>").addClass("Hyperlink");
				span.append(link);
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

	function convertTitle(titlepara_txt) {
		var title = $("<title></title>");
		title.append(titlepara_txt);
		convert.head.append(title);
		// insert the nav element
		convert.body.prepend(convert.nav);
		// add the required header info per HTMLBook spec
		var header = $("<header></header>");
		var booktitle = $("<h1></h1>");
		booktitle.append(titlepara_txt);
		header.append(booktitle);
		convert.body.prepend(header);
	}

	// Set default value for title in case we don't find one below
	var titlepara_txt = "title unavailable"
	//Now run through each docx w:p definition and add it to the html document
	docx.value.children.forEach(function (para, index, paras) {
		// find the title of the book - cycling through paras in titlepage section to look for title style match
		var tpstyle = styles["titleStyle"]["titlepage-style"]
		if ((para.styleId) && (stripTrailingZero(para.styleId) == styles["titleStyle"]["titlepage-style"])) {
			var i = 1;
			while ((i < 20) && (titlepara_txt == "title unavailable")) {
				if ((para.styleId) && (stripTrailingZero(paras[index + i].styleId)) == styles["titleStyle"]["title-style"]) {
					titlepara_txt = convert.aggregateParaText(paras[index + i]);
				} else if (paras[index + i].styleId.match(/Section-/)) {
					break;
				} else {
					i++;
				}
			}
		}

		if (para.type == "paragraph") {
			if (index > 0) {
				convert.convertDocxParagraph(para, styles, docxStyles, paras[index - 1]);
			} else {
				convert.convertDocxParagraph(para, styles, docxStyles);
			}
		} else if (para.type == "table"){
			if (index > 0) {
				convert.convertTable(para, styles, docxStyles, paras[index - 1]);
			} else {
				convert.convertTable(para, styles, docxStyles);
			}
		} else {
			console.log(para.type);
		}
	});
	// add title to head and header element, & empty nav for book
	convertTitle(titlepara_txt);

	// add notes to the html document
	var notesjson = docx.value.notes._notes;
	var notesjsonarr = Object.keys(notesjson).map(function(k) { return notesjson[k] });
	var footnotesection = $("<section data-type='appendix' class='footnotes'></section>");
	// find each footnote in notes, convert them to paras, and append to notes section
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
		}
		// append notes section to body
		convert.body.append(footnotesection);
	});
	// find each endnote in notes, convert them to paras, and append directly to body
	notesjsonarr.forEach(function (note, index, paras) {
		if (note.noteType == "endnote") {
      // console.log(JSON.stringify(note.body)) < useful for debug
			var noteref_found = false;
			var noteparent = $("<div class='endnotetext'></div>");
			var endnoteid = "endnotetext_" + note.noteId;
			noteparent.attr("id", endnoteid);
			note.body.forEach(function (para, index, paras) {
				var p = $("<p></p>");
				if (para.styleId) {
					p.addClass(para.styleId);
				}
				p.append(convert.aggregateParaText(para));
				// if this para has no Endnote ref, and preceding paras in the note also have no EndnoteRef,
				//  adding it preceding the note's <div>, as its own <p>, with class 'nonEndnoteTxt' (wdv-202)
				if ((para.children[0] && para.children[0].styleId == "EndnoteReference") || noteref_found == true) {
					noteparent.append(p);
					noteref_found = true;
				} else {
					p.addClass("nonEndnoteTxt");
					convert.body.append(p);
				}
			});
			convert.body.append(noteparent);
		} else if (note.noteType != "footnote") {
			console.log(note.type);
		};
	});

	// INSERT ANY DOC POSTPROCESSING INSTRUX HERE

	// add extra endnote reference nesting
	$('span.EndnoteReference').each(function () {
    // setting default class 'Normal' in case it's not styled in Word (Normal)
    var parentclass = "normal";
    if ($(this).parent().attr("class")) {
      parentclass = $(this).parent().attr("class").toLowerCase();
    }
		var notenumber = $(this).contents();
		// cleaning any whitespace from ref id's \/
		var sanitized_notenum = String(notenumber).replace(/ /g, '');
		var newid = "endnoteref_" + sanitized_notenum;
		var childspan = $("<span class='endnotereference'></span>").attr("id", newid);
		// added notenumber.text check to prevent generation of non-unique endnoteref_ id's as per WDV-338
		//  these appear to be universally cases where stray spaces are (accidentally) styled with EndnoteReference
		//  and don't need to be wrapped like a real endnote ref.
		if ((parentclass !== "endnotetext") && (notenumber.text().trim() != "")) {
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

// making our own prototype function so we can nest table paras into table elements as we aggregate
Convert.prototype.convertTable = function (para, styles, docxStyles, prevPara) {
	var $ = this.document;
	var convert = this;
	var tags = styles.tagsForDocxStyle(para.styleId);
		var t = $("<table></table>");
		var tablerows = para.children

		// cycle through rows in table
		for (var i=0; i < tablerows.length; i++) {
			// console.log("a table row", tablerows[i])	// < for debugging
			var tr = $("<tr></tr>");
			var header_row = false;
			if (tablerows[i].isHeader == true) {
				header_row = true;
			}
			var tablecells = tablerows[i].children
			t.append(tr)

			// cycle through cells in row
			for (var j=0; j < tablecells.length; j++) {
				// console.log("table cell: ", tablecells[j])	// < for debugging
				var tcell = $("<td></td>");
				if (header_row == true) {
					tcell = $("<th></th>");
				}
				var cellparas = tablecells[j].children
				tr.append(tcell)

				// cycle through paras in cell
				for (var k=0; k < cellparas.length; k++) {
					// console.log("cellparas: ", cellparas[k])	// < for debugging
					var p = $("<p></p>");
					if (cellparas[k].styleId) {
						p.addClass(cellparas[k].styleId);
					}
					p.append(convert.aggregateParaText(cellparas[k]));
					tcell.append(p)
				}
			}
		}
		// append the table to current html
		convert.current.append(t);
}

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
			htmlEl.addClass(stripTrailingZero(para.styleId));
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

		//  \/\/\/ commenting out; is giving undesirable results with bulleted list that includes autonumbering in the xml
		// // add numbering to list items that were auto-numbered in Word
		// if (para.numbering) {
		// 	htmlEl.addClass("autonumber");
		// 	if (para.styleId != prevPara.styleId) {
		// 		htmlEl.addClass("liststart");
		// 	};
		// };

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
