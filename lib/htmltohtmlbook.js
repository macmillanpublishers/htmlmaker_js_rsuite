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
var jsonParsed = JSON.parse(jsonString);

// get title style from styles.json
var stylesjsonPath = path.join(__dirname, '..', 'styles.json');
var stylesjsonString = fs.readFileSync(stylesjsonPath, 'utf8');
var stylesjsonParsed = JSON.parse(stylesjsonString);
var titlestyle = stylesjsonParsed["title"]["title-style"];

var toplevelheads = jsonParsed['toplevelheads'];
var partheads = jsonParsed['partheads'];
var headingparas = jsonParsed['headingparas'];
var extractparas = jsonParsed['extractparas'];
var epigraphparas = jsonParsed['epigraphparas'];
var verseparas = jsonParsed['verseparas'];
// var boxparas = jsonParsed['boxparas'];
// var sidebarparas = jsonParsed['sidebarparas'];
var illustrationparas = jsonParsed['illustrationparas'];
var imageholders = jsonParsed['imageholders'];
var captionparas = jsonParsed['captionparas'];
var illustrationsrcparas = jsonParsed['illustrationsrcparas'];
var unorderedlistparaslevel1 = jsonParsed['unorderedlistparaslevel1'];
var orderedlistparaslevel1 = jsonParsed['orderedlistparaslevel1'];
var unorderedlistparaslevel2 = jsonParsed['unorderedlistparaslevel2'];
var orderedlistparaslevel2 = jsonParsed['orderedlistparaslevel2'];
var unorderedlistparaslevel3 = jsonParsed['unorderedlistparaslevel3'];
var orderedlistparaslevel3 = jsonParsed['orderedlistparaslevel3'];
var listparaparas = jsonParsed['listparaparas'];
var footnotetextselector = jsonParsed['footnotetextselector'];
var endnotetextselector = jsonParsed['endnotetextselector'];
var omitparas = jsonParsed['omitparas'];
var chaptertitleparas = jsonParsed['chaptertitleparas'];
var chapternumberparas = jsonParsed['chapternumberparas'];
var versatileblockparas = jsonParsed['versatileblockparas'];
var containerparas = jsonParsed['containerparas']
var containerendparas = jsonParsed['containerendparas'];


// a global variable for id generation
var idCounter = 0;
// a global var to track key errors
var errorhash = {};

// MUST HAPPEN FIRST: adding parent containers
// wrap content in main sections

function errorcount(errorhash, string) {
  if (errorhash[string]) {
    errorhash[string]++;
  } else {
    errorhash[string]=1;
  }
  return errorhash;
}

function makeNot(list) {
  return "body:not(" + list + "), section:not(" + list + "), div:not(" + list + "), blockquote:not(" + list + "), h1:not(" + list + "), pre:not(" + list + "), aside:not(" + list + "), p:not(" + list + "), li:not(" + list + "), figure:not(" + list + "), figcaption:not(" + list + "), img:not(" + list + "), table:not(" + list + ")";
}

function makeNotDivParaWithClass(classname, list) {
  return "div." + classname + " > p:not(" + list + ")";
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


// ADD part-level divs
//  this is a new feature for rsuite-html conversion. If you want to undo it and flatten Part
//  hierarchy back out (Parts at same level as other sections), comment this section out and look for the
//  conditional in 'Add chapter level sections' with 'if (toplevelheads[k].type == "part")', where commmenting
//  for two lines needs to be swapped

// getting a selector for all section starts except chapter, as de facto Ends to any Part.
var toplevelheads_nochapters = [];
for (var k in toplevelheads) {
  if (toplevelheads[k].type != "chapter") {
    toplevelheads_nochapters.push(k);
  }
};
var toplevelheads_nochapterslist = toplevelheads_nochapters.join(", ");

partheads.forEach(function ( val ) {
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(toplevelheads_nochapterslist).addBack();
    var newdiv = $("<div/>").attr("data-type", "part").addClass("parttemp");
    $(this).before(newdiv);
    var node = $(".parttemp");
    node.append(nextsiblings);
    $(".parttemp").removeClass("parttemp");
    // add a class to the old divider paras so we can grab them later & use contents for section headers
    $(this).addClass("sectionstartpara");
  });
});


// ADD chapter-level sections
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
  var newType = toplevelheads[k].type;
  var newClass = toplevelheads[k].class;
  var newLabel = toplevelheads[k].label;
  $( k ).each(function() {
    var nextsiblings = $(this).nextUntil(toplevelheadslist).addBack();
    var newTag = "<section/>";
    if (toplevelheads[k].type == "part") {
      // to add part handling back as nonhierarchal section start, uncomment below line and comment/rm 'return true'
      // newTag = "<div/>";
      return true;
    };
    var myID = makeID();
    var newsection = $(newTag).attr("data-type", newType).attr("id", myID).addClass("temp");
    if (newClass !== undefined) {
      newsection.addClass(newClass);
    };
    if (newLabel !== undefined) {
      newsection.attr("title", newLabel);
    };
    if ($(this).text() == "notoc") {
      newsection.addClass("notoc");
      $(this).text("");
    }
    $(this).before(newsection);
    var node = $(".temp");
    node.append(nextsiblings);
    $(".temp").removeClass("temp");
    // add a class to the old divider paras so we can grab them later & use contents for section headers
    $(this).addClass("sectionstartpara")
  });
};

////// WRAPPING TAGGED CONTAINERS...
// (setting useful container selectors)
var containerendlist = containerendparas.join(", ");
var allcontainerstartparas = []
for (var key in containerparas) {
  allcontainerstartparas = allcontainerstartparas.concat(containerparas[key]);
}
// capturing everything that should cause a container to end.
var containerandsectionparaslist = allcontainerstartparas.concat(containerendparas).concat(alltoplevelsections).join(", ");

/// ... Boxes
containerparas['box'].forEach(function ( val ) {
  var containerclass = val.slice(1);
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<aside/>").attr("data-type", "sidebar").addClass("box").addClass(containerclass).addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Extracts
containerparas['extract'].forEach(function ( val ) {
  var containerclass = val.slice(1);
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<blockquote/>").addClass(containerclass).addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

// -- As of 2-20 we are getting rid of Verse container paras.
//  commenting this section out as a result, not deleting in case they make a comeback!
// /// ... Verse
// containerparas['verse'].forEach(function ( val ) {
//   $( val ).each(function() {
//     var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
//     // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
//     if (nextsiblings.length == 1) {
//       console.log("found an empty container, removing");
//       nextsiblings.first().remove(); // remove container-start para
//       return true;
//     }
//     var newparent = $("<div/>").addClass("verse").addClass("temp");
//     $(this).before(newparent);
//     var node = $(".temp");
//     node.append(nextsiblings);
//     var containerend_class = $(".temp").next().attr("class");
//     if (containerendparas.indexOf("."+containerend_class) != -1) {
//       $(".temp").next(containerendlist).remove(); // remove END para
//     } else {
//       errorhash = errorcount(errorhash, "container not properly ended");
//     }
//     $(".temp").removeClass("temp");
//     nextsiblings.first().remove(); // remove container-start para
//   });
// });

/// ... Letter
containerparas['letter'].forEach(function ( val ) {
  var containerclass = val.slice(1);
  $( val ).each(function() {
    // console.log(this)
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<blockquote/>").attr("data-type", "letter").addClass(containerclass).addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Computer
containerparas['computer'].forEach(function ( val ) {
  var containerclass = val.slice(1);
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<div/>").addClass("computer").addClass(containerclass).addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Sidebars
containerparas['sidebar'].forEach(function ( val ) {
  var containerclass = val.slice(1);
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<aside/>").attr("data-type", "sidebar").addClass(containerclass).addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Pullquote
containerparas['pullquote'].forEach(function ( val ) {
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<aside/>").attr("data-type", "sidebar").addClass("pullquote").addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Images
containerparas['image'].forEach(function ( val ) {
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<figure/>").addClass("Image-PlacementImg").addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Tables
containerparas['table'].forEach(function ( val ) {
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<aside/>").attr("data-type", "sidebar").addClass("table").addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});

/// ... Recipes
containerparas['recipe'].forEach(function ( val ) {
  $( val ).each(function() {
    var nextsiblings = $(this).nextUntil(containerandsectionparaslist).addBack();
    // skip to next selection if no elements in container (emtpy container's self-closing tag not properly honored by prince)
    if (nextsiblings.length == 1) {
      console.log("found an empty container, removing");
      nextsiblings.first().remove(); // remove container-start para
      return true;
    }
    var newparent = $("<blockquote/>").attr("data-type", "recipe").addClass("temp");
    $(this).before(newparent);
    var node = $(".temp");
    node.append(nextsiblings);
    var containerend_class = $(".temp").next().attr("class");
    if (containerendparas.indexOf("."+containerend_class) != -1) {
      $(".temp").next(containerendlist).remove(); // remove END para
    } else {
      errorhash = errorcount(errorhash, "container not properly ended");
    }
    $(".temp").removeClass("temp");
    nextsiblings.first().remove(); // remove container-start para
  });
});


////// WRAPPING unTAGGED CONTAINERS...

/// ...Extracts (contiguous p's)
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
     var newblockquote = $("<blockquote/>").addClass("tempextractparas tempextractclass").addClass("looseextract");
     $(this).before(newblockquote);
     var node = $(".tempextractparas");
     node.append(prevblock);
     node.append(nextblock);
     $(".tempextractparas").removeClass("tempextractparas");
   };
   });
 });
// move leading and trailing versatile paras out of extract blocks
moveLeadingVersatileParas("blockquote.tempextractclass");
moveTrailingVersatileParas("blockquote.tempextractclass");
// remove temp class used for parent selector in function calls above
$(".tempextractclass").removeClass("tempextractclass");

/// ...Epigraphs (contiguous p's)
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
moveLeadingVersatileParas("blockquote[data-type=epigraph]");
moveTrailingVersatileParas("blockquote[data-type=epigraph]");

/// ...Verse (contiguous p's)
// wrap verse in pre; include versatile paragraphs
var verseAndVersatileParas = verseparas.concat(versatileblockparas);
var verseAndVersatileList = verseAndVersatileParas.join(", ");
var notPoetryOrVersatile = makeNot(verseAndVersatileList);
verseparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'div') {
     var prevblock = $($(this).prevUntil(notPoetryOrVersatile).get().reverse());
     var nextblock = $(this).nextUntil(notPoetryOrVersatile).addBack();
     var newdiv = $("<div/>").addClass("verse").addClass("temp");
     $(this).before(newdiv);
     var node = $(".temp");
     node.append(prevblock);
     node.append(nextblock);
     $(".temp").removeClass("temp");
   };
   });
 });
 // move leading and trailing versatile paras out of verse pre blocks
 moveLeadingVersatileParas("div.verse");
 moveTrailingVersatileParas("div.verse");


/// ...Images (contiguous p's)
// wrap illustrations in figure parent;
// assumes only one actual image per figure;
// only adds figure if an image is referenced;
// (i.e., will not wrap solo caption and source paras)
var imageholderslist = imageholders.join(", ");
var illustrationparaslist = illustrationparas.join(", ");
var notillustrationparaslist = makeNot(illustrationparaslist);
notillustrationparaslist = notillustrationparaslist + ", " + imageholderslist;
// for rsuite, because we are wrapping these twice, and for are adding the Imageholder classname to the container-type-figures,
//  we need to qualify the loose imageholders we are scooping up here with elementType, else we end up RE-wrapping figures from above.
var imageholderparas = []
imageholders.forEach(function ( val ) {
  var imgpara = "p" + val;
  imageholderparas.push(imgpara);
});

imageholderparas.forEach(function ( val ) {
   $( val ).each(function() {
   var thisparent = $(this).parent();
   var parentEl = thisparent[0].tagName.toLowerCase();
   if (parentEl !== 'figure') {
     var prevblock = $($(this).prevUntil(notillustrationparaslist).get().reverse());
     var nextblock = $(this).nextUntil(notillustrationparaslist).addBack();
     var newfigure = $("<figure/>").addClass("Image-PlacementImg").addClass("figtemp");
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

// add illustration src link placeholders   //<-- skipping this for rsuite conversion implementaiton; we don't have a style for this any longer
var illustrationsrc_selectorstring = getSelectorStringforListWithPrefix("figure ", illustrationsrcparas);
$(illustrationsrc_selectorstring).contents().wrap('<a class="fig-link"></a>');

// change <p> elements with caption classes to <figcaption> elements
var captions = $(captionlist);
replaceEl(captions, "<figcaption/>");

// change div.verse and div.computer <p>s to <pre>switch
var verse_notversatilepara_selectorstring = makeNotDivParaWithClass("verse", versatileblockparas);
var nested_verseparas = $(verse_notversatilepara_selectorstring);
replaceEl(nested_verseparas, "<pre/>")
var computer_notversatilepara_selectorstring = makeNotDivParaWithClass("computer", versatileblockparas);
var nested_computerparas = $(computer_notversatilepara_selectorstring);
replaceEl(nested_computerparas, "<pre/>")

///// LISTS
// convert list paras to <li>s
function makeListItems(unorderedlistparaslevel1, orderedlistparaslevel1, unorderedlistparaslevel2, orderedlistparaslevel2, unorderedlistparaslevel3, orderedlistparaslevel3) {
  var alllists = unorderedlistparaslevel1.concat(orderedlistparaslevel1).concat(unorderedlistparaslevel2).concat(orderedlistparaslevel2).concat(unorderedlistparaslevel3).concat(orderedlistparaslevel3);
  var listparasli = [];

  alllists.forEach(function ( val ) {
    $( val ).each(function() {
      var thisclass = $(this).attr("class");
      $(this).wrap( "<li class=\"" + thisclass + "\"></li>" );
    });
  });
}

function makeSubLists(sublistparas, sublisttype, includeparas, sublistclassname) {
  var sublistparaslist = sublistparas.concat(includeparas).join(", ");
  var notsublistparaslist = makeNot(sublistparaslist);
  var notselector = notsublistparaslist + ", ul, ol"
  var sublistparasli = [];

  sublistparas.forEach(function ( val ) {
    var thisLI = "li" + val;
    sublistparasli.push(thisLI);
  });

  sublistparasli.forEach(function ( val ) {
    $( val ).each(function() {
    var thisparentclass = $(this).parent().attr("class").toLowerCase();
      if (thisparentclass !== sublistclassname) {
      var nextblock = $(this).nextUntil(notselector).addBack();
      var newlisttag = "<" + sublisttype + "/>";
      var newlist = $(newlisttag).addClass(sublistclassname).addClass("tempsublist");
      $(this).before(newlist);
      var subnode = $(".tempsublist");
      subnode.append(nextblock);
      $(".tempsublist").removeClass("tempsublist");
    };
    });
  });
}

// similar to sublists above.
function makeLists(listparas, listtype, includeparas, listclassname='') {
  var alllistparaslist = listparas.concat(includeparas).join(", ");
  var notlistparaslist = makeNot(alllistparaslist);
  var notselector = notlistparaslist + ", ul, ol"
  var listparasli = [];

  listparas.forEach(function ( val ) {
    var thisLI = "li" + val;
    listparasli.push(thisLI);
  });

  listparasli.forEach(function ( val ) {
    $( val ).each(function() {
    var thisparent = $(this).parent();
    var parentEl = thisparent[0].tagName.toLowerCase();
    if (parentEl !== 'ul' && parentEl != 'ol') {
      var nextblock = $(this).nextUntil(notselector).addBack();
      var newlisttag = "<" + listtype + "/>";
      var newlist = $(newlisttag).addClass("templist");
      $(this).before(newlist);
      var node = $(".templist");
      node.append(nextblock);
      $(".templist").removeClass("templist");
    };
    });
  });
}

// This pulls nested lists into the previous <li> instead of
//  them being loose in the parent <ul> or <ol>. As per W3C standard
function embedSublistInPrecedingLi(sublistclassname) {
  var orphansublist_selector = $("li + ."+sublistclassname);
  orphansublist_selector.each(function() {
    var nextblock = $(this).nextUntil(':not(ol.'+sublistclassname+', ul.'+sublistclassname+')').addBack();  //":not(" + sublistclassname + ")"
    var newparent = $(this).prev();
    newparent.append(nextblock);
  });
}

// Handle list *paragraph* styles
function nestListParaParas(listparaparas) {
  var listparapara_p_list = getSelectorStringforListWithPrefix("p", listparaparas);
  $(listparapara_p_list).each(function () {
    var parentli = $(this).parent("li");
    // in case other list items have been nested into this <li>, we need to capture all children
    //  (since parent <li> will be removed)
    var allcontents = $(this).parent("li").children();
    var newparent = parentli.prev("li");
    // exclude list *paragraph* styled para without a preceding sibling <li> to append to
    if (newparent.length === 1) {
      newparent.append(allcontents);
      parentli.remove();
    } else {
      errorhash = errorcount(errorhash, "list-para not preceded by li");
    }
  });
}

makeListItems(unorderedlistparaslevel1, orderedlistparaslevel1, unorderedlistparaslevel2, orderedlistparaslevel2, unorderedlistparaslevel3, orderedlistparaslevel3);

//  consolidate list style groups for functions below
var level1listparalist = unorderedlistparaslevel1.concat(orderedlistparaslevel1)
var level2listparalist = unorderedlistparaslevel2.concat(orderedlistparaslevel2)
var level3listparalist = unorderedlistparaslevel3.concat(orderedlistparaslevel3);
var level2and3listparalist = level3listparalist.concat(unorderedlistparaslevel2).concat(orderedlistparaslevel2);

// when wrapping <li>s into <ol>s or <uls> these are the list style types we are bundling
//  we want listparaparas of the same level or lower, and listparas of lower levels only
//  no point policing whether listparaparas match their list paras here, they need to get wrapped regarless of erroneous styling
var level1includeparas = level2and3listparalist.concat(listparaparas);
var level1includeparas_unique = [...new Set(level1includeparas)];
var level2includeparas = level3listparalist.concat(listparaparas);
var level2includeparas_unique = [...new Set(level2includeparas)];
var level3includeparas = [...level3listparalist];
// a for loop to get rid of level1 listparaparas
for (i=0; i < level2includeparas_unique.length; i++) {
  if (level1listparalist.includes(level2includeparas_unique[i])) {
    level2includeparas_unique.splice(i, 1)
  }
}
// a for loop to get rid of level1 listparaparas
for (i=0; i < level3includeparas.length; i++) {
  if (!listparaparas.includes(level3includeparas[i])) {
    level3includeparas.splice(i, 1)
  }
}

// to make <ol>s and <ul>s for a given list-level: first for list paras, then for listparaparas. This way orphan listparaparas end up in their own list
function makeListsPerLevel(levellistparas, listparaparas, unorderedlevellistparas, includeparas, makeListFunc, listclassname='') {
  // cycle through this level's paras
  var levellistparaparas = []
  for (i=0; i < levellistparas.length; i++) {
  // for now only cycle through listparas
    if (!listparaparas.includes(levellistparas[i])) {
      if (unorderedlevellistparas.includes(levellistparas[i])) {
        makeListFunc([levellistparas[i]], "ul", includeparas, listclassname);
      } else {
        makeListFunc([levellistparas[i]], "ol", includeparas, listclassname);
      }
    } else {
      // store this level's lpp's in a new array
      levellistparaparas.push(levellistparas[i])
    }
  }
  //  now capture any leftover orphan paras for this level
  for (i=0; i < levellistparaparas.length; i++) {
    if (unorderedlevellistparas.includes(levellistparaparas[i])) {
      makeListFunc([levellistparaparas[i]], "ul", includeparas, listclassname);
    } else {
      makeListFunc([levellistparaparas[i]], "ol", includeparas, listclassname);
    }
  }
}

makeListsPerLevel(level1listparalist, listparaparas, unorderedlistparaslevel1, level1includeparas_unique, makeLists)
makeListsPerLevel(level2listparalist, listparaparas, unorderedlistparaslevel2, level2includeparas_unique, makeSubLists, "level2list")
makeListsPerLevel(level3listparalist, listparaparas, unorderedlistparaslevel3, level3includeparas, makeSubLists, "level3list")

embedSublistInPrecedingLi('level3list')
embedSublistInPrecedingLi('level2list')

nestListParaParas(listparaparas)

// // // // FOOTNOTES
// move footnotes inline
var footnotelist = footnotetextselector.join(", ");
var footnotelistselector = $(footnotelist);

footnotelistselector.each(function () {
  var notenumber = $(this).attr('data-noteref');
  // fix notes with custom markers here:
  var note_marker = $(this).find('span.FootnoteReference');
  //  (noteref text is blank for a standard note, only has content for custom values)
  if (note_marker.text() != "") {
    var note_id = notenumber + note_marker.text();
    var docreference = $('span[id=footnote_undefined]').filter(function() {
      return $(this).text().trim() === note_id;
      // had to add this trim() ^ b/c Windows htmlconvert greedily added a trailing space to note_id
    });
    var newidvalue = 'footnote_' + notenumber;
    note_marker.text('');
    docreference.attr('id', 'footnote_' + notenumber);
    docreference.text(notenumber);
  };
  var node = $('span[id=footnote_' + notenumber + ']');
  node.empty();
  if (node.length > 0) {
    while ((this.firstChild) && (this.firstChild.children.length > 0)) {
      node.append(this.firstChild);
    };
  } else if ($(this).text() != '') {
    errorhash = errorcount(errorhash, "footnote not properly re-linked with marker (data-noteref " + notenumber + "): '" + $(this).text() + "'");
  }
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
// Create endnotes section & heading, move endnote text into new endnotes section
var endnotelist = endnotetextselector.join(", ");
var endnotelistselector = $(endnotelist);
// nonEndnoteText class is added in convert.js, to paras that precede Endnote refs in Endnote
var all_endnoteparas_selector = $(endnotelist + ", div.nonEndnoteTxt");

var endnoteconfig = toplevelheads['.Section-NotesSNT'];
var endnoteparent = $("<section data-type=" + endnoteconfig['type'] + " class=" + endnoteconfig['class'] + ">");
var endnoteheading =$("<h1>" + endnoteconfig['label'] + "</h1>");
endnoteheading.addClass(titlestyle)
endnoteparent.append(endnoteheading);

// if we have any endnotes, add our new section with endnotes appended
var endnotetextcheck = false;
if (endnotelistselector.length > 0) {
  all_endnoteparas_selector.each(function() {
    endnoteparent.append(this);
    // we use this bit to make sure at least one div.endnotetext has text, before we add a section for it.
    if (endnotetextcheck == false && $(this).text()) {
      endnotetextcheck = true;
    }
  });
  if (endnotetextcheck == true) {
    $('body').append(endnoteparent);
  }
}


//// Create heading tags
// adding context to Heading paras, since they can appear in other containers where they would not be h1's
var partheadselectorstring = getSelectorStringforListWithPrefix("div[data-type=part] > ", headingparas);
var sectionheadselectorstring = getSelectorStringforListWithPrefix("section > ", headingparas);
var headingslistselector = $(partheadselectorstring + ", " + sectionheadselectorstring);

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
// we want the header h1 text to come from user-entered content in Section Start para; using previous header configuration as a backup, & for Section-Notes
$("section, div[data-type='part']").each(function( ){
  var sectionStartPara = $(this).children("p.sectionstartpara").first();
  if (sectionStartPara.length > 0) {
    var sectionStartParaContent = sectionStartPara.text();
    if (sectionStartParaContent != "") {
    } else {
      // inserting a blank space, so the h1 element gets created. The ncx.xsl will turn this into an empty ncx element, which will fail epubcheck..
      //  which is what we want so users learn (for now)
      sectionStartParaContent = " ";
      // errorhash = errorcount(errorhash, "section start para with no content");  //<-- not critical to raise, + will throw epub error &/or get caught in StyleReport
    }
    // add the heading to the header element
    var newHeading = $("<h1/>").prepend(sectionStartParaContent);
    var newHeader = $("<header/>").prepend(newHeading);
    $(this).prepend(newHeader);
  } else {
    // old header handling: // (relies on h1 tags that we created previously)
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
  }
});

// remove any old divider (section start) paragraphs now that we scooped up their content for headers
$("p.sectionstartpara").remove();

// // add autonumbering to parts, chapters, appendixes <--- note - this appears to be doing nothing currently -MR
// $("section[data-type='chapter']").each(function( index ){
// });

// for ChapNumbers followed by ChapTitles, remove them, add their text to "data-autolabel" attribute for ChapTitle, add comment after ChapTitle
// first create selector from all combinations of chapnumparas + chaptitleparas, using section prefix to eliminate divs
var autoLabelSelectorArray = [];
var chapternumberparas_edit = chapternumberparas.map(function(item){
  return "section > " + item;
  return item;
})
// Using the line below did autolabeling for Chapters and Parts too with RSuite styles. Using the _edit list makes it apply to only chapters
// chapternumberparas.forEach(function(cn) {
chapternumberparas_edit.forEach(function(cn) {
  chaptertitleparas.forEach(function(ct) {
    autoLabelSelectorArray.push(cn + " + " + ct);
  });
});
var autoLabelSelectorString = autoLabelSelectorArray.join(", ");
var autoLabelSelector = $(autoLabelSelectorString);

autoLabelSelector.each(function() {
  var comment = '<!--A Chapter Number paragraph directly preceding this Chapter Title paragraph was removed during conversion to HTML. Its content was added to the Chapter Title element as the value of \\"data-labeltext\\" and should be inserted back into the text flow via CSS or during transformation to the output formats, as needed.-->';
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

// clear custom note markers:
$("span.custom_note_mark").remove();
$("p.EndnoteText > span.EndnoteReference").text("");
$("div.footnote > span.FootnoteText > span.FootnoteReference").text("");
// // remove blank continuation notice endnote
// //  leaving this commented for now; can have ready if it comes up in real life
// if (endnotelistselector.length > 0) {
//   endnotelistselector.each(function() {
//     if ($(this).find("span.EndnoteReference").length == 0) {
//       $(this).remove();
//       return false; // < there should never be more than one
//     }
// })}

// removing unneccessary paras.
// THIS NEEDS TO HAPPEN LAST

var omitparaslist = omitparas.join(", ");

$(omitparaslist).remove();

// add a <meta> tag to <head> with any conversion errors that occurred
Object.keys(errorhash).forEach(function (key) {
  var errstring = key + ": " + errorhash[key] + " occurrence(s).";
  console.log(errstring);
  var newmeta = $("<meta/>").attr("name", "conversion_err").attr("content", errstring);
  $('head').append(newmeta);
})

// prepend DOCTYPE
$.root().prepend("<!DOCTYPE html>")

// write the new html to a file
  var output = $.html();
    fs.writeFile(file, output, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("Content has been updated!");
  });
});
