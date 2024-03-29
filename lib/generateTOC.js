var fs = require('fs');
var cheerio = require('cheerio');
var file = process.argv[2];
var path = require('path');

fs.readFile(file, function editContent (err, contents) {
  $ = cheerio.load(contents, {
          xmlMode: true
        });

// get heading class-lists from style-config.json
var jsonPath = path.join(__dirname, '..', 'style_config.json');
var jsonString = fs.readFileSync(jsonPath, 'utf8');
var jsonParsed = JSON.parse(jsonString);
var headingparas = jsonParsed['headingparas'];
var toplevelheads = jsonParsed['toplevelheads'];

// get the existing nav element, add data-type attribute
var navElement = $("nav");
navElement.attr("data-type","toc");

// set a var for the existing nav's ordered list
var navOl = $("nav > ol.toc");

// adding context to Heading para selectors, since they can appear in other containers where they would not be h1's
function getSelectorStringforListWithPrefix(prefix, classList) {
  var myString = "";
  classList.forEach(function( myClass ) {
    if (myString.length > 0) {
      myString += ", ";
    };
    myString += prefix + myClass;
  });
  return myString;
}
var partheadselectorstring = getSelectorStringforListWithPrefix("div[data-type=part] > ", headingparas);
var sectionheadselectorstring = getSelectorStringforListWithPrefix("section > ", headingparas);
var headingslistselector = $(partheadselectorstring + ", " + sectionheadselectorstring);

// Short-stylenames for RSuite TOC styles
var toc_fmstyle = "TOC-FrontmatterTocfm";
var toc_chapstyle = "TOC-ChapterTocch";
var toc_bmstyle = "TOC-BackmatterTocbm";
var toc_partstyle = "TOC-PartTocpt";

// define FM, chapter, part, & bm via data-types based on entries in style-config.json
var fm_datatypes = ['preface','titlepage','halftitlepage','copyright-page','dedication','foreword','introduction'];
var chap_datatypes = ['chapter'];
var bm_datatypes = ['appendix','conclusion','afterword','acknowledgments','glossary','bibliography','index'];
var part_datatypes = ['part'];

// collect classes / datatypes of sections set to be excluded from TOC
var notocdatatypes = []
var notocclasses = []
for (var k in toplevelheads) {
  if (toplevelheads[k].tocexclude == "True") {
      if (toplevelheads[k].class) {
        notocclasses.push(toplevelheads[k].class);
      } else if (toplevelheads[k].type) {
        notocdatatypes.push(toplevelheads[k].type);
      }
  }
}

// add new list items and nested links for each H1 in the list above
headingslistselector.each(function(){
    // do some sorting based on parent section type (exclude sections with notoc classes and data-types)
    if ((notocclasses.indexOf($(this).parent().attr("class")) == -1) && (notocdatatypes.indexOf($(this).parent().attr("data-type")) == -1)) {
      var myId = $(this).attr("id");
      // get class dor toc style based on parent section type (special handling for acknowledgments, which can be fm or bm)
      if ($(this).parent().attr("data-type") == 'acknowledgments') {
        if (fm_datatypes.indexOf($(this).parent().prev().attr("data-type")) != -1) {
          var myClass = toc_fmstyle
        } else {
          var myClass = toc_bmstyle
        }
      } else if (fm_datatypes.indexOf($(this).parent().attr("data-type")) != -1) {
          var myClass = toc_fmstyle
      } else if (chap_datatypes.indexOf($(this).parent().attr("data-type")) != -1) {
        var myClass = toc_chapstyle
      } else if (bm_datatypes.indexOf($(this).parent().attr("data-type")) != -1) {
        var myClass = toc_bmstyle
      } else if (part_datatypes.indexOf($(this).parent().attr("data-type")) != -1) {
        var myClass = toc_partstyle
      } else {
        var myClass = $(this).attr("class");
      }
      var myContents = $(this).text();
      if ($(this).next()[0] && $(this).next()[0].tagName.toLowerCase() == "h1") {  // concat text of part title to part number, for single Part TOC entry
        myContents = myContents + ": " + $(this).next().text();
      }
      if ((myContents.trim() != '') && ($(this).prev()[0].tagName.toLowerCase() != "h1")) {   // skip items with no non-whitespace content, or second consecutive h1's (pn+pt)
        var newLi = $("<li/>").addClass(myClass);
        // if we have autonumbering we need to wrap contents in a span,
        //  so we can target the chaptername for the :before CSS pseudoselector,
        //  separately from the :before that's targeting the _link_ (for nav page number)
        if ((typeof $(this).attr("data-autolabel") !== 'undefined') && (typeof $(this).attr("data-labeltext") !== 'undefined')) {
          var newSpan = $("<span/>").text(myContents).attr("data-autolabel", $(this).attr("data-autolabel")).attr("data-labeltext", $(this).attr("data-labeltext"))
          var newLink = $("<a/>").attr('href', "#"+myId).addClass("toc-link");
          newLink.append(newSpan)
        } else {
          var newLink = $("<a/>").text(myContents).attr('href', "#"+myId).addClass("toc-link");
        }
        newLi.append(newLink);
        navOl.append(newLi);
      }
    }
});

// if texttoc exists, find it and move our nav directly preceding
var contentsSection = $("section.texttoc");
if (contentsSection.length > 0) {
  navElement.insertBefore(contentsSection[0]);
}

// write the new html to a file
  var output = $.html();
    fs.writeFile(file, output, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("Content has been updated!");
  });
});
