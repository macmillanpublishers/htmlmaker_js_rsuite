# htmlmaker_js

JavaScript replacement for Macmillan's .docx-to-HTML conversion.

This process exists in two pieces. The first converts the .docx file to a simple HTML file of paragraphs. The second piece converts the HTML file to HTMLBook.

## To Run

Convert .docx to simple HTML:

```
$ htmlmaker docx-path output-dir styles.json style-functions.js
```

Convert HTML to HTMLBook:

```
$ node htmltohtmlbook.js output-dir/docx-name.html
```

Generate linked nav for the new html:

```
$ node generateTOC.js output-dir/docx-name.html
```

## HTML Conversion Notes

The htmltohtmlbook conversion adds additional layers of conversion, based on the instructions provided in the styles_config.json file. This file dictates where section breaks should be inserted, where to add blockquote elements, pre elements, aside elements, etc. Here's a description of each currently-supported paragraph type that can be configured in the styles_config.json file, and what the output will look like.

### Main Book Sections

_JSON group:_ toplevelheads

_HTML element:_ section or div (per HTMLBook spec)

_data-type:_ from JSON

_class: none_

This group determines the elements or classes that mark the start of a new section, as well as the type of section that will be added. When the specified element is encountered, a new parent will be added based on the section type specified, and this parent will wrap around all subsequent children until another "toplevelheads" element is encountered (of any type).

Every element in this group *must* include a child item of "type", which determines the type of parent section that will be added, and may also include the optional child items of "class" and "label", to add an extra class and title attribute to the generated parent section.

#### Sample 1

_JSON:_

```
"toplevelheads": {
    ".Section-Titlepagesti": [
        {"type": "titlepage",
        "label": "Title Page"}
    ],
    ".Section-Copyrightscr": [
        {"type": "copyright-page",
        "label": "Copyright Page"}
    ],
    ".Section-Dedicationsde": [
        {"type": "dedication",
        "label": "Dedication"}
    ],
    ".Section-Prefacespf": [
        {"type": "preface"}
    ],
    ".Section-Partspt": [
        {"type": "part"}
    ],
    ".Section-Chapterscp": [
        {"type": "chapter"}
    ]
```

_Input HTML:_

```html
<p class="Section-Titlepagesti" />
<p class="TitlepageBookTitletit">Alice in Wonderland</p>
<p class="Section-Dedicationsde" />
<p class="Dedicationded">For Alice.</p>
<p class="Section-Chapterscp" />
<p class="ChapTitlect">Chapter 1: Down the Rabbit Hole</p>
<p class="TextStandardtx">Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'</p>
```

_Output HTML:_

```html
<section data-type="titlepage" title="Title Page">
<p class="TitlepageBookTitletit">Alice in Wonderland</p>
</section>
<section data-type="dedication" title="Dedication">
<p class="Dedicationded">For Alice.</p>
</section>
<section data-type="chapter">
<p class="ChapTitlect">Chapter 1: Down the Rabbit Hole</p>
<p class="TextStandardtx">Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'</p>
\[...\]
```

#### Sample 2

_JSON:_

_Input HTML:_

```html
<p class="TitlepageBookTitletit">Alice in Wonderland</p>
<p class="Dedicationded">For Alice.</p>
<p class="ChapTitlect">Chapter 1: Down the Rabbit Hole</p>
<p class="TextStandardtx">Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'</p>
```

_Output HTML:_

```html
<section data-type="titlepage">
  <p class="TitlepageBookTitletit">Alice in Wonderland</p>
</section>
<section data-type="dedication">
  <p class="Dedicationded">For Alice.</p>
</section>
<section data-type="chapter">
  <p class="ChapTitlect">Chapter 1: Down the Rabbit Hole</p>
  <p class="TextStandardtx">Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'</p>
\[...\]
```

### Parts

_JSON group:_ partheads

_HTML element:_ div

_data-type:_ part

_class: none_

This is used as an extra instruction to create a div rather than a section, when processing the toplevelheads paragraphs (see previous section).

### Top-Level Headings

_JSON group:_ headingparas

_HTML element:_ h1

_data-type: none_

_class: none_

Paragraphs that should be converted to h1 elements.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="TitlepageBookTitletit">Alice in Wonderland</p>
<p class="TitlepageAuthorau">Lewis Carroll</p>
```

_Output HTML:_

```html
<h1 class="TitlepageBookTitletit">Alice in Wonderland</h1>
<p class="TitlepageAuthorau">Lewis Carroll</p>
```

### Extracts

_JSON group:_ extractparas

_HTML element:_ blockquote

_data-type: none_

_class: none_

Paragraphs that should be wrapped in a blockquote parent. All contiguous paragraphs from this group will be wrapped in a single blockquote, until a non-extractparas element is encountered.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="TextStandardtx">...'and how funny it'll seem, sending presents to one's own feet! And how odd the directions will look!</p>
<p class="Extractext">ALICE’S RIGHT FOOT, ESQ.</p>
<p class="Extractext">HEARTHRUG,</p>
<p class="Extractext">NEAR THE FENDER,</p>
<p class="Extractext">(WITH ALICE’S LOVE).</p>
<p class="TextStandardtx">Oh dear, what nonsense I'm talking!'</p>
```

_Output HTML:_

```html
<p class="TextStandardtx">...'and how funny it'll seem, sending presents to one's own feet! And how odd the directions will look!</p>
<blockquote>
  <p class="Extractext">ALICE’S RIGHT FOOT, ESQ.</p>
  <p class="Extractext">HEARTHRUG,</p>
  <p class="Extractext">NEAR THE FENDER,</p>
  <p class="Extractext">(WITH ALICE’S LOVE).</p>
</blockquote>
<p class="TextStandardtx">Oh dear, what nonsense I'm talking!'</p>
```

### Epigraphs

_JSON group:_ epigraphparas

_HTML element:_ blockquote

_data-type:_ epigraph

_class: none_

Paragraphs that should be wrapped in a blockquote parent, which will be given an extra _data-type_ attribute of _epigraph_. All contiguous paragraphs from this group will be wrapped in a single blockquote, until a non-epigraphparas element is encountered.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="ChapTitlect">Chapter 1</p>
<p class="Epigraph-verseepiv">Did I request thee, Maker, from my clay</p>
<p class="Epigraph-verseepiv">To mould me Man, did I solicit thee</p>
<p class="Epigraph-verseepiv">From darkness to promote me?</p>
<p class="EpigraphSourceeps">Paradise Lost, X, 743-45</p>
<p class="TextStandardtx">I am by birth a Genevese, and my family is one of the most distinguished of that republic.</p>
```

_Output HTML:_

```html
<p class="ChapTitlect">Chapter 1</p>
<blockquote data-type="epigraph">
  <p class="Epigraph-verseepiv">Did I request thee, Maker, from my clay</p>
  <p class="Epigraph-verseepiv">To mould me Man, did I solicit thee</p>
  <p class="Epigraph-verseepiv">From darkness to promote me?</p>
  <p class="EpigraphSourceeps">Paradise Lost, X, 743-45</p>
</blockquote>
<p class="TextStandardtx">I am by birth a Genevese, and my family is one of the most distinguished of that republic.</p>
```

### Poetry

_JSON group:_ poetryparas

_HTML element:_ pre

_data-type: none_

_class:_ poetry

Paragraphs that should be wrapped in a pre parent, which will be given an extra _class_ attribute of _poetry_. All contiguous paragraphs from this group will be wrapped in a single blockquote, until a non-poetryparas element is encountered.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="TextStandardtx">...and the words did not come the same as they used to do:–</p>
<p class="VerseTextvtx">How doth the little crocodile</p>
<p class="VerseTextvtx">Improve his shining tail,</p>
<p class="VerseTextvtx">And pour the waters of the Nile</p>
<p class="VerseTextvtx">On every golden scale!</p>
<p class="VerseTextvtx">How cheerfully he seems to grin,</p>
<p class="VerseTextvtx">How neatly spread his claws,</p>
<p class="VerseTextvtx">And welcome little fishes in</p>
<p class="VerseTextvtx">With gently smiling jaws!</p>
<p class="TextStandardtx">'I'm sure those are not the right words,' said poor Alice</p>
```

_Output HTML:_

```html
<p class="TextStandardtx">...and the words did not come the same as they used to do:–</p>
<pre class="poetry">
  <p class="VerseTextvtx">How doth the little crocodile</p>
  <p class="VerseTextvtx">Improve his shining tail,</p>
  <p class="VerseTextvtx">And pour the waters of the Nile</p>
  <p class="VerseTextvtx">On every golden scale!</p>
  <p class="VerseTextvtx">How cheerfully he seems to grin,</p>
  <p class="VerseTextvtx">How neatly spread his claws,</p>
  <p class="VerseTextvtx">And welcome little fishes in</p>
  <p class="VerseTextvtx">With gently smiling jaws!</p>
</pre>
<p class="TextStandardtx">'I'm sure those are not the right words,' said poor Alice</p>
```

### Sidebars

_JSON group:_ sidebarparas

_HTML element:_ aside

_data-type:_ sidebar

_class: none_

Paragraphs that should be wrapped in an aside parent, with a _data-type_ attribute of _sidebar_. All contiguous paragraphs from this group will be wrapped in a single aside, until a non-boxparas element is encountered.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="Text-Standardtx">Some people are very concerned about certain kinds of special information.</p>
<p class="SidebarHeadsbh">Special Information</p>
<p class="SidebarTextNo-Indentsbtx1">This is a paragraph within a box. We&#x2019;re just testing things out to see how they look.</p>
<p class="SidebarTextsbtx">This is some more text that describes the special information that people care about.</p>
<p class="Text-Standardtx">Some text that follows a box.</p>
```

_Output HTML:_

```html
<p class="Text-Standardtx">Some people are very concerned about certain kinds of special information.</p>
<aside data-type="sidebar">
  <p class="SidebarHeadsbh">Special Information</p>
  <p class="SidebarTextNo-Indentsbtx1">This is a paragraph within a box. We&#x2019;re just testing things out to see how they look.</p>
  <p class="SidebarTextsbtx">This is some more text that describes the special information that people care about.</p>
</aside>
<p class="Text-Standardtx">Some text that follows a box.</p>
```

### Boxes

_JSON group:_ boxparas

_HTML element:_ aside

_data-type:_ sidebar

_class:_ box

Boxes are handled almost identically to sidebars; they are essentially another form of sidebar. These paragraphs will be wrapped in an aside parent, with a _data-type_ attribute of _sidebar_ and an extra _class_ attribute of _box_. All contiguous paragraphs from this group will be wrapped in a single aside, until a non-boxparas element is encountered.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="Text-Standardtx">Some people are very concerned about certain kinds of special information.</p>
<p class="BoxHeadbh">Special Information</p>
<p class="BoxTextNo-Indentbtx1">This is a paragraph within a box. We&#x2019;re just testing things out to see how they look.</p>
<p class="BoxTextbtx">This is some more text that describes the special information that people care about.</p>
<p class="Text-Standardtx">Some text that follows a box.</p>
```

_Output HTML:_

```html
<p class="Text-Standardtx">Some people are very concerned about certain kinds of special information.</p>
<aside data-type="sidebar" class="box">
  <p class="BoxHeadbh">Special Information</p>
  <p class="BoxTextNo-Indentbtx1">This is a paragraph within a box. We&#x2019;re just testing things out to see how they look.</p>
  <p class="BoxTextbtx">This is some more text that describes the special information that people care about.</p>
</aside>
<p class="Text-Standardtx">Some text that follows a box.</p>
```

### Versatile Block Paragraphs

_JSON group:_ versatileblockparas

_HTML element: unchanged_

_data-type: unchanged_

_class: unchanged_

Versatile Block Paragraphs are paragraphs that should be included in contiguous blocks of _any_ of the  block-types listed above: Extracts, Epigraphs, Poetry, Boxes, or Sidebars. Versatile Block Paragraphs at the beginning or end of a contiguous block are not included in the block.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="Text-Standardtx">Some people are very concerned about certain kinds of special information.</p>
<p class="SidebarHeadsbh">Special Information</p>
<p class="SpaceBreak-Internalint">(this versatile block para will be included in the <aside>...)</p>
<p class="BookmakerProcessingInstructionbpi">(...and so will this one)</p>
<p class="SidebarTextNo-Indentsbtx1">This is a paragraph within a box. We&#x2019;re just testing things out to see how they look.</p>
<p class="BookmakerProcessingInstructionbpi">this versatile block para will not be included in the <aside> block...</p>
<p class="SpaceBreak-Internalint">...and neither will this one</p>
<p class="Text-Standardtx">Some text that follows a box.</p>
```

_Output HTML:_

```html
<p class="Text-Standardtx">Some people are very concerned about certain kinds of special information.</p>
<aside data-type="sidebar">
  <p class="SidebarHeadsbh">Special Information</p>
  <p class="SpaceBreak-Internalint">(this versatile block para will be included in the <aside>...)</p>
  <p class="BookmakerProcessingInstructionbpi">(...and so will this one)</p>
  <p class="SidebarTextNo-Indentsbtx1">This is a paragraph within a box. We&#x2019;re just testing things out to see how they look.</p>
</aside>
<p class="BookmakerProcessingInstructionbpi">this versatile block para will not be included in the <aside> block...</p>
<p class="SpaceBreak-Internalint">...and neither will this one</p>
<p class="Text-Standardtx">Some text that follows a box.</p>
```

### Images

_JSON group:_ illustrationparas

_HTML element:_ figure

_data-type: none_

_class:_ Illustrationholderill

This list collects all the different pieces that could be contained within a figure block. There are several components to a figure block: the image itself, any caption text, and any image source or credits. Because of the different layers of handling, there are 2 more paragraph groups for images:

#### Image Holder

_JSON group:_ imageholders

_HTML element:_ img

_data-type: none_

_class: none_

This is the paragraph holder for the actual image file. The text content of this paragraph should be the image filename only.

#### Image Caption

_JSON group:_ captionparas

_HTML element:_ p

_data-type: none_

_class: none_

While there is no special handling for the caption paragraph itself, this text will be used as the _alt_ attribute for the image, if both are present.

#### Image Holder

_JSON group:_ imageholders

_HTML element:_ img

_data-type: none_

_class: none_

This is the paragraph holder for the actual image file. The text content of this paragraph should be the image filename only.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="Illustrationholderill">authorphoto.jpg</p>
<p class="Captioncap">Portrait of the artist as a young woman.</p>
<p class="IllustrationSourceis">Image courtesy of a photographer</p>
```

_Output HTML:_

```html
<figure id="d1e3488" class="Illustrationholderill">
  <img src="images/authorphoto.jpg" alt="Portrait of the artist as a young woman."/>
  <p class="Captioncap">Portrait of the artist as a young woman.</p>
  <p class="IllustrationSourceis">Image courtesy of a photographer</p>
</figure>
```

### Lists

_JSON group:_ unorderedlistparas, orderedlistparas, unorderedsublistparas, orderedsublistparas

_HTML element:_ ul, ol

_data-type: none_

_class: none_

Two levels of lists are currently supported; use the "sublistparas" lists to select paragraphs that should be converted to nested lists within an existing list parent. Paragraphs matched by the list groups will be wrapped in _li_ elements, and all contiguous _li_ elements will be wrapped in a parent _ol_ or _ul_, as appropriate.

#### Sample 1

_JSON:_

_Input HTML:_

```html
<p class="Text-Standardtx">Here is some text that preceds our list:</p>
<p class="ListBulletbl">Bullet list item one</p>
<p class="ListBulletbl">Second bullet list item</p>
<p class="ListNumSubentrynsl">A nested numbered list</p>
<p class="ListNumSubentrynsl">A second nested numbered list item</p>
<p class="ListBulletbl">Third level-1 bullet list item</p>
<p class="ListBulletbl">The fourth top-level list item</p>
<p class="Text-Standardtx">And this text comes after the list.</p>
```

_Output HTML:_

```html
<p class="Text-Standardtx">Here is some text that preceds our list:</p>
<ul>
  <li class="ListBulletbl"><p class="ListBulletbl">Bullet list item one</p></li>
  <li class="ListBulletbl"><p class="ListBulletbl">Second bullet list item</p>
    <ol>
      <li class="ListNumSubentrynsl"><p class="ListNumSubentrynsl">A nested numbered list</p></li>
      <li class="ListNumSubentrynsl"><p class="ListNumSubentrynsl">A second nested numbered list item</p></li>
    </ol>
  </li>
  <li class="ListBulletbl"><p class="ListBulletbl">Third level-1 bullet list item</p></li>
  <li class="ListBulletbl"><p class="ListBulletbl">The fourth top-level list item</p></li>
</ul>
<p class="Text-Standardtx">And this text comes after the list.</p>
```

### Footnotes

_JSON group:_ footnotetextselector

_HTML element:_ span

_data-type: none_

_class: none_

When running the full conversion from .docx to HTMLBook, footnotes that are embedded in Word will be converted to our default markup, and then will be moved inline and converted to comply with the HTMLBook spec. If you are bypassing the Word conversion and submitting an HTML file to be converted to HTMLBook via the secondary conversion, then footnotes must conform to the following markup specification:

* The full text of each footnote must be contained within a single parent (e.g., a div or p element).
* Each footnote must have a _data-noteref_ attribute containing the note number (this number must correspond to the _id_ attribute of the footnote reference, as described below).
* Footnote parents must have a common class by which they can all be selected. E.g.:

```html
<div class="footnote" data-noteref="1">
<p class="FootnoteText">You will knock, and a sharp-eyed old man answer. &#x201C;Yes?&#x201D; He&#x2019;ll look you over and see what you hold: a fist-size pouch, fat with coin. &#x201C;What do you want?&#x201D;</p>
<p class="FootnoteText">&#x201C;To talk to the lady of the warrior Cumalo, please. I was a friend of his.&#x201D;</p>
<p class="FootnoteText">You see the elder grasps at once what news you bring, but he&#x2019;ll bridle and bluster anyway, in the tedious way of northern men. &#x201C;No call to go bothering my daughter. And it ain&#x2019;t proper, nohow, you calling on a married lady. Speak your piece to me.&#x201D;</p>
</div>
<div class="footnote" data-noteref="2">
<p class="FootnoteText">Tiefer alt. A voice to sing the pale sour out of lemons, sing them luscious orange; as much the sensations of <span class="spanitaliccharactersital">eros</span> on the body as mere sound in the ears.</p>
</div>
```

* Footnote references (the marker denoting the location in the text to which the footnote corresponds) must be tagged as a span with an id of "footnote_' \+ the note number. E.g.:

```html
<p class="TextStandardtx">Macmillan Publishers is currently located in the Flatiron Building.<span id="footnote_1">1</span></p>
```

#### Sample 1

_JSON:_

_Input HTML:_

```html
```

_Output HTML:_

```html
```
