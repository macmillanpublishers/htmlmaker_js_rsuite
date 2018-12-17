##Root properties

####title `{}`
Defines what will be added to the html page's title tag.

```
"title": {
  "titlepage-style": "Section-TitlepageSTI",
  "title-style": "TitleTtl"
}
```
*	#####doc-style `text`
	Defines the docx style id that the title will be retrieved from.

####tags `[]`
List of tag definitions that dictates how the docx paragraphs match up to html elements.

	"tags" : [
	]

##Tag Definition

####tag-name `text`
The name of the html tag to match to.

####data-types `[]`
A list of data-type definitions that describe how match to and process docx paragraphs for this html tag.

####reference-only `boolean` `optional`
Whether or not this tag definition is for reference when processing for a `parent` property in the `behavior` data-types definition. The tag will not be used to match against docx paragraphs during document conversion.

	{
		"tag-name": "section",
		"reference-only" : true,
		"data-types": []
	}

###data-type
Are used to match against docx paragraph style id's and then describe the behavior in which they are processed.

####data-type `text`
Text to be added to the `data-type` attribute of the html tag. Note that a data-type is REQUIRED for aggregating parents (e.g., sections, blockquotes, etc.)

####attributes `[]`
List of attribute strings to be added to the html tag

	attributes: ['some-attr="a value"']

would output

	<tag some-attr="a value"/>

####doc-style `[]`
List of docx style id's to match against this tag


####class `[]`
List of class names to add to html tag `class` attribute

####inner-text `boolean`
Set the text of the html tag to be the text of the docx paragraph

####nav `boolean` `optional`
If this html tag should be added to the TOC

####add-nav `boolean` `optional`
Inject the TOC right before this html tag in the html output. Defining this on more than one tag will result in multiple TOC's

####function `text` `optional`
run a function from the options style functions file defined when the conversion was first ran

####behavior `{}`
Which behavior the conversion should use to place the html tag in the document

*	#####name `text`
	One of `aggregate`, `new-parent`, `new-sibling`, `new-child`
	*	`aggregate` - Aggregate this and the following docx paragraphs if they match this tag's doc-type definition. If the tag does not yet exist, it will be created. Note that a data-type is REQUIRED in order for the child paras to correctly be aggregated inside the parent.
	*	`new-parent` - Create a new html tag based on the reference name, and add it to the working document before the this tag as a new parent.
	*	`new-sibling` - Add this tag to the current working document as a sibling
	*	`new-child` - Add this tag to the current working document as a child and push it onto the working stack as a parent for the next docx paragraph

*	#####parent `text` `optional`
	Reference name of tag definition that will be created as a `new-parent` behavior for this html tag

*	#####required-parent `[]` `optional`
	List of `data-type` or tag names that are a required parent of this html tag. If the current working html node does not match this list, the conversion recursively works back up the document tree to find the required parent. An error is thrown if parent is not found.
