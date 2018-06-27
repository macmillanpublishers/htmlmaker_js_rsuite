var fs = require('fs');
var cheerio = require('cheerio');
var file = process.argv[2];

fs.readFile(file, function editContent (err, contents) {
  $ = cheerio.load(contents, {
          xmlMode: true
        });

// get the existing nav element, add data-type attribute
var navElement = $("nav");
navElement.attr("data-type","toc");

// set a var for the existing nav's ordered list
var navOl = $("nav > ol.toc");

// declare the H1 classes we will be linking to for TOC
// used the headingparas list from htmltohtmlbook.js, commented out those that are n/a
var headingparas = [".BMHeadbmh",
                    ".BMHeadNonprintingbmhnp",
                    ".BMHeadALTabmh",
                    ".AppendixHeadaph",
                    ".AboutAuthorTextHeadatah",
                    ".PartNumberpn",
                    ".PartTitlept",
                    ".ChapTitlect",
                    ".ChapTitleALTact",
                    ".ChapTitleNonprintingctnp",
                    ".FMHeadfmh",
                    ".FMHeadNonprintingfmhnp",
                    ".FMHeadALTafmh",
                    //".FrontSalesTitlefst",
                    //".BOBAdTitlebobt",
                    //".AdCardMainHeadacmh",
                    //".TitlepageBookTitletit",
                    //".HalftitleBookTitlehtit"
                    ];

// create heading tags
var headingslist = headingparas.join(", ");
var headingslistselector = $(headingslist);

// add new list items and nested links for each H1 in the list above
headingslistselector.each(function(){
    var myId = $(this).attr("id");
    var myClass = $(this).attr("class");
    var myContents = $(this).text();
    if (myContents.trim() != '') {
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
