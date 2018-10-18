var fs = require('fs');
var cheerio = require('cheerio');
var file = process.argv[2];

fs.readFile(file, function editContent (err, contents) {
  $ = cheerio.load(contents, {
          xmlMode: true
        });

// get heading class-lists from style-config.json
var jsonPath = path.join(__dirname, '..', 'style_config.json');
var jsonString = fs.readFileSync(jsonPath, 'utf8');
var jsonParsed = JSON.parse(jsonString)
var headingparas = jsonParsed['headingparas'];

// get the existing nav element, add data-type attribute
var navElement = $("nav");
navElement.attr("data-type","toc");

// set a var for the existing nav's ordered list
var navOl = $("nav > ol.toc");

// // declare the H1 classes we will be linking to for TOC
// // used the headingparas list from htmltohtmlbook.js, commented out those that are n/a
// var headingparas = [".BMHeadbmh",
//                     ".BMHeadNonprintingbmhnp",
//                     ".BMHeadALTabmh",
//                     ".AppendixHeadaph",
//                     ".AboutAuthorTextHeadatah",
//                     ".PartNumberpn",
//                     ".PartTitlept",
//                     ".ChapTitlect",
//                     ".ChapTitleALTact",
//                     ".ChapTitleNonprintingctnp",
//                     ".FMHeadfmh",
//                     ".FMHeadNonprintingfmhnp",
//                     ".FMHeadALTafmh",
//                     //".FrontSalesTitlefst",
//                     //".BOBAdTitlebobt",
//                     //".AdCardMainHeadacmh",
//                     //".TitlepageBookTitletit",
//                     //".HalftitleBookTitlehtit"
//                     ];

// // create heading tags
// var headingslist = headingparas.join(", ");
// var headingslistselector = $(headingslist);

// adding context to Heading paras, since they can appear in other containers where they would not be h1's
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

var partheadselectorstring = getSelectorStringforListWithPrefix("div[data-type=part] > ", headingparas)
var sectionheadselectorstring = getSelectorStringforListWithPrefix("section > ", headingparas)
var headingslistselector = $(partheadselectorstring + ", " + sectionheadselectorstring);


// add new list items and nested links for each H1 in the list above
headingslistselector.each(function(){
    var myId = $(this).attr("id");
    var myClass = $(this).attr("class");
    var myContents = $(this).text();
    if (myContents.trim() != '') {      // skip items with no non-whitespace content
      var newLi = $("<li/>").addClass(myClass);
      var newLink = $("<a/>").text(myContents).attr('href', "#"+myId).addClass("toc-link");
      newLi.append(newLink);
      navOl.append(newLi);
  }
});


// write the new html to a file
  var output = $.html();
    fs.writeFile(file, output, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("Content has been updated!");
  });
});
