var fs = require('fs');
var cheerio = require('cheerio');
var file = process.argv[2];
var path = require('path');

fs.readFile(file, function editContent (err, contents) {
  $ = cheerio.load(contents, {
          xmlMode: true
        });

// the default list of htmlbook top-level sections
var htmlbooksections = ["body[data-type='book']",
                        "section[data-type='chapter']",
                        "div[data-type='part']",
                        "section[data-type='appendix']",
                        "section[data-type='afterword']",
                        "section[data-type='bibliography']",
                        "section[data-type='glossary']",
                        "section[data-type='preface']",
                        "section[data-type='foreword']",
                        "section[data-type='introduction']",
                        "section[data-type='halftitlepage']",
                        "section[data-type='titlepage']",
                        "section[data-type='copyright-page']",
                        "section[data-type='colophon']",
                        "section[data-type='acknowledgments']",
                        "section[data-type='conclusion']",
                        "section[data-type='dedication']",
                        "nav[data-type='toc']",
                        "section[data-type='index']"];

// get paragraph class-lists from style-config.json
var jsonPath = path.join(__dirname, '..', 'style_config.json');
var jsonString = fs.readFileSync(jsonPath, 'utf8');
var jsonParsed = JSON.parse(jsonString)


var toplevelheads = jsonParsed['toplevelheads'];
var partheads = jsonParsed['partheads'];
var headingparas = jsonParsed['headingparas'];
var extractparas = jsonParsed['extractparas'];
var epigraphparas = jsonParsed['epigraphparas'];
var poetryparas = jsonParsed['poetryparas'];
var boxparas = jsonParsed['boxparas'];
var sidebarparas = jsonParsed['sidebarparas'];
var illustrationparas = jsonParsed['illustrationparas'];
var imageholders = jsonParsed['imageholders'];
var captionparas = jsonParsed['captionparas'];
var illustrationsrcparas = jsonParsed['illustrationsrcparas'];
var unorderedlistparas = jsonParsed['unorderedlistparas'];
var orderedlistparas = jsonParsed['orderedlistparas'];
var unorderedsublistparas = jsonParsed['unorderedsublistparas'];
var orderedsublistparas = jsonParsed['orderedsublistparas'];
var footnotetextselector = jsonParsed['footnotetextselector'];
var omitparas = jsonParsed['omitparas'];
var versatileblockparas = jsonParsed['versatileblockparas'];

// a global variable for id generation
var idCounter = 0;

// MUST HAPPEN FIRST: adding parent containers
// wrap content in main sections

function makeNot(list) {
  return "body:not(" + list + "), section:not(" + list + "), div:not(" + list + "), blockquote:not(" + list + "), h1:not(" + list + "), pre:not(" + list + "), aside:not(" + list + "), p:not(" + list + "), li:not(" + list + "), figure:not(" + list + ")";
}

function getSelectorString(myParentSelector, childSelector, classList) {
  var myString = "";
  classList.forEach(function( myClass ) {
    if (myString.length > 0) {
      myString += ", ";
    };
    myString += myParentSelector + " " + myClass + ":" + childSelector;
  });
  return myString;
}

function moveTrailingVersatileParas(myParentSelector) {
  var trailingParaSelectorString = getSelectorString(myParentSelector, 'last-child', versatileblockparas);
  while ($(trailingParaSelectorString).length > 0) {
    $(trailingParaSelectorString).each( function() {
      var myParent = $(this).parent();
       $(this).insertAfter(myParent);
    });
  };
}

function moveLeadingVersatileParas(myParentSelector) {
  var leadingParaSelectorString = getSelectorString(myParentSelector, 'first-child', versatileblockparas);
  while ($(leadingParaSelectorString).length > 0) {
    $(leadingParaSelectorString).each( function() {
      var myParent = $(this).parent();
       $(this).insertBefore(myParent);
    });
  };
}

//function to replace element, keeping innerHtml & attributes
  function replaceEl(selector, newTag) {
    selector.each(function(){
      var myAttr = $(this).attr();
      var myHtml = $(this).html();
      $(this).replaceWith(function(){
          return $(newTag).html(myHtml).attr(myAttr);
      });
    });
  }

//function to replace element, keeping innerHtml BUt NOT attributes
  function replaceElNoAttr(selector, newTag) {
    selector.each(function(){
      var myHtml = $(this).html();
      $(this).replaceWith(function(){
          return $(newTag).html(myHtml);
      });
    });
  }

// a function to make an id
  function makeID() {
    idCounter++;
    return "sectid" + Math.random().toString(36).substr(2, 4) + idCounter;
  }

// leave this commented until we're ready to add real part handling.
// Currently we're just putting div.part at the same level as other sections.
// add part-level divs
// var partheadslist = partheads.join(", ");

// partheads.forEach(function ( val ) {
//   $( val ).each(function() {
//     var nextsiblings = $(this).nextUntil(partheadslist).addBack();
//     var newdiv = $("<div/>").attr("data-type", "part").addClass("parttemp");
//     $(this).before(newdiv);
//     var node = $(".parttemp");
//     node.append(nextsiblings);
//     $(".parttemp").removeClass("parttemp");
//   });
// });

// add chapter-level sections
var toplevelheadsarr = [];

for (var k in toplevelheads) {
  toplevelheadsarr.push(k);
};

// combine our list of section dividers with the
// default htmlbook dividers
var alltoplevelsections = toplevelheadsarr.concat(htmlbooksections);

// make a selector string that includes all section dividers
var toplevelheadslist = alltoplevelsections.join(", ");

// loop through each divider paragraph and
// create a parent section around it
for (var k in toplevelheads) {
  var newType = toplevelheads[k][0].type;
  var newClass = toplevelheads[k][0].class;
  var newLabel = toplevelheads[k][0].label;
  $( k ).each(function() {
    var nextsiblings = $(this).nextUntil(toplevelheadslist).addBack();
    var newTag = "<section/>";
    if (toplevelheads[k][0].type == "part") {
      newTag = "<div/>"
    };
    var myID = makeID();
    var newsection = $(newTag).attr("data-type", newType).attr("id", myID).addClass("temp");
    if (newClass !== undefined) {
      newsection.addClass(newClass);
    };
    if (newLabel !== undefined) {
      newsection.attr("title", newLabel);
    };
    $(this).before(newsection);
    var node = $(".temp");
    node.append(nextsiblings);
    $(".temp").removeClass("temp");
  });
};

// remove the old divider paragraphs
toplevelheadsarr.forEach(function ( val ) {
  $( val ).remove();
});

// wrap extracts in blockquote; include versatile paragraphs
var extractAndVersatileParas = extractparas.concat(versatileblockparas);
var extractAndVersatileList = extractAndVersatileParas.join(", ");
var notExtractOrVersatile = makeNot(extractAndVersatileList);

extractparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'blockquote') {
     var prevblock = $($(this).prevUntil(notExtractOrVersatile).get().reverse());
     var nextblock = $(this).nextUntil(notExtractOrVersatile).addBack();
     var newblockquote = $("<blockquote/>").addClass("tempextractparas tempextractclass");
     $(this).before(newblockquote);
     var node = $(".tempextractparas");
     node.append(prevblock);
     node.append(nextblock);
     $(".tempextractparas").removeClass("tempextractparas");
   };
   });
 });

// move leading and trailing versatile paras out of extract blocks
moveLeadingVersatileParas("blockquote.tempextractclass")
moveTrailingVersatileParas("blockquote.tempextractclass")
// remove temp class used for parent selector in function calls above
$(".tempextractclass").removeClass("tempextractclass");

// wrap epigraphs in blockquote; include versatile paragraphs
var epigraphPlusVersatileParas = epigraphparas.concat(versatileblockparas);
var epigraphPlusVersatileList = epigraphPlusVersatileParas.join(", ");
var notEpigraphOrVersatile = makeNot(epigraphPlusVersatileList);

epigraphparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'blockquote') {
     var prevblock = $($(this).prevUntil(notEpigraphOrVersatile).get().reverse());
     var nextblock = $(this).nextUntil(notEpigraphOrVersatile).addBack();
     var newblockquote = $("<blockquote/>").attr("data-type", "epigraph").addClass("tempepigraphparas");
     $(this).before(newblockquote);
     var node = $(".tempepigraphparas");
     node.append(prevblock);
     node.append(nextblock);
     $(".tempepigraphparas").removeClass("tempepigraphparas");
   };
   });
 });

// move leading and trailing versatile paras out of epigraph blocks
moveLeadingVersatileParas("blockquote[data-type=epigraph]")
moveTrailingVersatileParas("blockquote[data-type=epigraph]")

// wrap poetry in pre; include versatile paragraphs
var poetryAndVersatileParas = poetryparas.concat(versatileblockparas);
var poetryAndVersatileList = poetryAndVersatileParas.join(", ");
var notPoetryOrVersatile = makeNot(poetryAndVersatileList);

poetryparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'pre') {
     var prevblock = $($(this).prevUntil(notPoetryOrVersatile).get().reverse());
     var nextblock = $(this).nextUntil(notPoetryOrVersatile).addBack();
     var newpre = $("<pre/>").addClass("poetry").addClass("temp");
     $(this).before(newpre);
     var node = $(".temp");
     node.append(prevblock);
     node.append(nextblock);
     $(".temp").removeClass("temp");
   };
   });
 });

 // move leading and trailing versatile paras out of poetry pre blocks
 moveLeadingVersatileParas("pre.poetry")
 moveTrailingVersatileParas("pre.poetry")

// wrap box in aside; include versatile paragraphs
var boxAndVersatileParas = boxparas.concat(versatileblockparas);
var boxAndVersatileList = boxAndVersatileParas.join(", ");
var notBoxOrVersatile = makeNot(boxAndVersatileList);

boxparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'aside') {
     var prevblock = $($(this).prevUntil(notBoxOrVersatile).get().reverse());
     var nextblock = $(this).nextUntil(notBoxOrVersatile).addBack();
     var newaside = $("<aside/>").attr("data-type", "sidebar").addClass("box").addClass("temp");
     $(this).before(newaside);
     var node = $(".temp");
     node.append(prevblock);
     node.append(nextblock);
     $(".temp").removeClass("temp");
   };
   });
 });

 // move leading and trailing versatile paras out of box <aside> blocks
 moveLeadingVersatileParas("aside.box")
 moveTrailingVersatileParas("aside.box")

// wrap sidebar in aside; include versatile paragraphs
var sidebarAndVersatileParas = sidebarparas.concat(versatileblockparas);
var sidebarAndVersatileList = sidebarAndVersatileParas.join(", ");
var notSidebarOrVersatile = makeNot(sidebarAndVersatileList);

sidebarparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'aside') {
     var prevblock = $($(this).prevUntil(notSidebarOrVersatile).get().reverse());
     var nextblock = $(this).nextUntil(notSidebarOrVersatile).addBack();
     var newaside = $("<aside/>").attr("data-type", "sidebar").addClass("temp");
     $(this).before(newaside);
     var node = $(".temp");
     node.append(prevblock);
     node.append(nextblock);
     $(".temp").removeClass("temp");
   };
   });
 });

 // move leading and trailing versatile paras out of sidebar <aside> blocks
 moveLeadingVersatileParas("aside[data-type=sidebar]")
 moveTrailingVersatileParas("aside[data-type=sidebar]")

// wrap illustrations in figure parent;
// assumes only one actual image per figure;
// only adds figure if an image is referenced;
// (i.e., will not wrap solo caption and source paras)
var imageholderslist = imageholders.join(", ");
var illustrationparaslist = illustrationparas.join(", ");
var notillustrationparaslist = makeNot(illustrationparaslist);
notillustrationparaslist = notillustrationparaslist + ", " + imageholderslist;

imageholders.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'figure') {
     var prevblock = $($(this).prevUntil(notillustrationparaslist).get().reverse());
     var nextblock = $(this).nextUntil(notillustrationparaslist).addBack();
     var newfigure = $("<figure/>").addClass("Illustrationholderill").addClass("figtemp");
     $(this).before(newfigure);
     var node = $(".figtemp");
     node.append(prevblock);
     node.append(nextblock);
     $(".figtemp").removeClass("figtemp");
   };
   });
 });

// create img tags after figure parent has been added
var imagelist = imageholders.join(", ");
var imagelistselector = $("p" + imagelist);

var captionlist = captionparas.join(", ");

imagelistselector.each(function(){
    var myID = $(this).attr("id");
    var mySrc = "images/" + $(this).text();
    var myCaption = $(this).siblings(captionlist).text();
    // move img to be the first child of the figure block
    $(this).parent().prepend(this);
    if (!myCaption) {
      myCaption = $(this).text();
    } else {
      myCaption = encodeURI(myCaption);
    }
    var myAlt = $(this).text();
    $(this).parent().attr("id", myID);
    $(this).replaceWith(function(){
        return $("<img/>").attr("src", mySrc).attr("alt", myCaption);
    });
  });

// add illustration src link placeholders
var illustrationsrclist = illustrationsrcparas.join(", ");
$(illustrationsrclist).contents().wrap('<a class="fig-link"></a>');

// change <p> elements with caption classes to <figcaption> elements
var captions = $(captionlist);
replaceEl(captions, "<figcaption/>");

// convert list paras to real lists;
// must occur after all the other parents are added

function makeListItems(unorderedlistparas, orderedlistparas, unorderedsublistparas, orderedsublistparas) {
  var alllists = unorderedlistparas.concat(orderedlistparas).concat(orderedsublistparas).concat(unorderedsublistparas);
  var listparasli = [];

  alllists.forEach(function ( val ) {
    $( val ).each(function() {
      var thisclass = $(this).attr("class");
      $(this).wrap( "<li class=" + thisclass + "></li>" );
    });
  });
}

function makeSubLists(sublistparas, sublisttype) {
  var sublistparaslist = sublistparas.join(", ");
  var notsublistparaslist = makeNot(sublistparaslist);
  var sublistparasli = [];

  sublistparas.forEach(function ( val ) {
    var thisLI = "li" + val;
    sublistparasli.push(thisLI);
  });

  sublistparasli.forEach(function ( val ) {
    $( val ).each(function() {
    var thisparentclass = $(this).parent().attr("class").toLowerCase();
      if (thisparentclass !== "sublist") {
      var prevblock = $($(this).prevUntil(notsublistparaslist).get().reverse());
      var nextblock = $(this).nextUntil(notsublistparaslist).addBack();
      var newlisttag = "<" + sublisttype + "/>";
      var newlist = $(newlisttag).addClass("sublist").addClass("tempsublist");
      $(this).before(newlist);
      var subnode = $(".tempsublist");
      subnode.append(prevblock);
      subnode.append(nextblock);
      $(".tempsublist").removeClass("tempsublist");
    };
    });
  });

  $("li + .sublist").each(function() {
    var newparent = $(this).prev();
    newparent.append(this);
  });
}

// second iteration
function makeLists(listparas, listtype, unorderedsublistparas, orderedsublistparas) {
  var listparaslist = listparas.join(", ");
  var alllists = listparas.concat(orderedsublistparas).concat(unorderedsublistparas);
  var alllistparaslist = alllists.join(", ");
  var notlistparaslist = makeNot(alllistparaslist);
  var listparasli = [];

  listparas.forEach(function ( val ) {
    var thisLI = "li" + val;
    listparasli.push(thisLI);
  });

  listparasli.forEach(function ( val ) {
    $( val ).each(function() {
    var thisparent = $(this).parent();
    var parentEl = thisparent[0].tagName.toLowerCase();
    if (parentEl !== listtype) {
      var prevblock = $($(this).prevUntil(notlistparaslist).get().reverse());
      var nextblock = $(this).nextUntil(notlistparaslist).addBack();
      var newlisttag = "<" + listtype + "/>";
      var newlist = $(newlisttag).addClass("templist");
      $(this).before(newlist);
      var node = $(".templist");
      node.append(prevblock);
      node.append(nextblock);
      $(".templist").removeClass("templist");
    };
    });
  });

}

makeListItems(unorderedlistparas, orderedlistparas, unorderedsublistparas, orderedsublistparas);

makeLists(unorderedlistparas, "ul", unorderedsublistparas, orderedsublistparas);
makeLists(orderedlistparas, "ol", unorderedsublistparas, orderedsublistparas);

makeSubLists(unorderedsublistparas, "ul");
makeSubLists(orderedsublistparas, "ol");

// move footnotes inline
var footnotelist = footnotetextselector.join(", ");
var footnotelistselector = $(footnotelist);

footnotelistselector.each(function () {
  var notenumber = $(this).attr('data-noteref');
  var node = $('span[id=footnote-' + notenumber + ']');
  node.empty();
  while (this.firstChild) {
    node.append(this.firstChild);
  };
  node.removeClass().attr("data-type", "footnote");
  $(this).remove();
});

// replace p tags in footnotes with span
$("span[data-type='footnote'] p").each(function(){
  var myAttr = $(this).attr();
  var myHtml = $(this).html();
  $(this).replaceWith(function(){
      return $("<span/>").html(myHtml).attr(myAttr);
  });
});

$('section.footnotes:empty').remove();

// create heading tags
var headingslist = headingparas.join(", ");
var headingslistselector = $(headingslist);

headingslistselector.each(function(){
    var myAttr = $(this).attr();
    var myHtml = $(this).html();
    $(this).replaceWith(function(){
        return $("<h1/>").html(myHtml).attr(myAttr);
    });
  });

// SETTING THE HEADER:

// functions for counting sections, so we can autonumber if needed
function getAutoNumber(mySelector) {
  var n = $(mySelector).length;
  return n;
};

function getCounter(myHash, mySelector) {
  if (myHash[mySelector]) {
    myHash[mySelector] = myHash[mySelector] + 1;
  } else {
    myHash[mySelector] = 1;
  }
  return(myHash[mySelector]);
}

var hash = {};

// creating the header block;
// this relies on the h1 tags that are created previously
$("section, div[data-type='part']").each(function( ){
  var myHeading = $(this).children("h1").first().clone().removeAttr("class").removeAttr("id");
  var myTitle = $(this).attr("title");
  var myType = $(this).attr("data-type");
  var myEl = this.tagName.toLowerCase();

  // get the total number of elements of this type
  var mySelector = "";
  var totalEls = "";
  var myLabel = "";
  var myCounter = "";

  // if there is no h1 element found BUT there is a title attribute on the section,
  // use the title attribute as the heading text
  if (myHeading[0] === undefined && myTitle !== undefined) {
    mySelector = myEl + "[title='" + myTitle + "']";
    totalEls = getAutoNumber(mySelector);
    myCounter = getCounter(hash, myTitle);
    myLabel = myTitle;
  // otherwise if there is no h1 element, use the data-type value
  } else if (myHeading[0] === undefined && myTitle === undefined) {
    // adjust the capitalization of the data-type value for human-readability
    mySelector = myEl + "[data-type='" + myType + "']";
    totalEls = getAutoNumber(mySelector);
    myCounter = getCounter(hash, myType);
    myLabel = myType.toLowerCase().replace(/-/g, " ").replace(/\b[a-z]/g, function(letter) {
      return letter.toUpperCase();
    });
  }

  var myLabelCounter = "";

  if (totalEls > 1) {
    myLabelCounter = " " + myCounter;
  }

  // if an h1 was found, we can use that as-is
  if (myHeading[0] !== undefined) {
    newHeading = myHeading;
  // otherwise, turn the label we created into an h1 tag
  // and add the required counter
  } else {
    myLabel = myLabel + myLabelCounter;
    newHeading = "<h1>" + myLabel + "</h1>";
  }

  // add the heading to the header element
  var newHeader = $("<header/>").prepend(newHeading);
  $(this).prepend(newHeader);
});

// add autonumbering to parts, chapters, appendixes
$("section[data-type='chapter']").each(function( index ){
});

// for ChapNumbers followed by ChapTitles, remove them, add their text to "data-autolabel" attribute for ChapTitle, add comment after ChapTitle
var chapTitlePara = $(".ChapNumbercn + .ChapTitlect, .ChapNumbercn + .ChapTitleALTact");
chapTitlePara.each(function() {
  var comment = $('<!--A Chapter Number paragraph (.ChapNumbercn) directly preceding this Chapter Title paragraph was removed during conversion to HTML. Its content was added to the Chapter Title element as the value of "data-labeltext" and should be inserted back into the text flow via CSS or during transformation to the output formats, as needed.-->');
  var chapNumberPara = $(this).prev();
  var labeltext = chapNumberPara.text();
  $(this).attr("data-autolabel", "yes");
  $(this).attr("data-labeltext", labeltext);
  chapNumberPara.remove();
  $(this).after(comment);
});

// Fixing markup of spans styled with direct formatting
$("span[style='font-weight: bold; font-style: italic;']").each(function( ){
  var myHtml = $(this).html();
  $(this).wrap("<strong/>");
  $(this).replaceWith(function(){
      return $("<em/>").html(myHtml);
  });
});

var ems = $("span[style='font-style: italic;']");
var strongs = $("span[style='font-weight: bold;']");

replaceElNoAttr (ems, "<em/>");
replaceElNoAttr (strongs, "<strong/>");

// removing unneccessary paras.
// THIS NEEDS TO HAPPEN LAST

var omitparaslist = omitparas.join(", ");

$(omitparaslist).remove();

// write the new html to a file
  var output = $.html();
    fs.writeFile(file, output, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("Content has been updated!");
  });
});
