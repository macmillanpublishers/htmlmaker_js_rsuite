* * * * *  OVERVIEW  * * * * *
There are 3 transforms hosted in this repo, typically run sequentially to convert a Word.docx into HTML.

The tests here are intended to check output against validated output for these 3 transforms, run individually or all together.

These scripts were tested in python 3.7.2 and 2.7.x



* * * * *  TEST RUNNING - Basics  * * * * *
To run all tests, use the command line to invoke file: 'run_TransformTests.py'.
This cmd will run all 3 transforms, on all test files, and diff the output:

`python run_TransformTests.py`

(Console output for transforms is shown in the terminal, which can be useful in knowing that things are progressing...)

Once the tests are finished, you should see a notice in the terminal indicating, either:
  a) No differences were found, or
  b) Differences were found, which files had differences, and where the diff reports for each file can be found (in a timestamped folder in ./tmp)



* * * * *  TEST RUNNING - Advanced  * * * * *
There are two optional parameters that can be added to the cmd-line call to choose partial test-sets:

A) You can specify testing for one particular transform, using one of the following values: "1", "2", "3" or "all". Here's what they do:
      1 - runs and diffs output for 'htmlmaker' transform only (.docx to .html conversion)
      2 - runs and diffs output for 'htmltohtmlbook' transform only (htmlmaker output to HTMLBook compliant html)
      3 - runs and diffs output for 'generateTOC' transform only (adds auto-TOC to HTMLBook compliant html)
      all - runs and diffs output for all 3 transforms run sequentially (this is also the default if this param is not included)

   Example: `python run_TransformTests.py 2`

B) You can include the name of a specific testfile to transform and diff output for only that file.
THIS REQUIRES that you specify a test(s) using the first parameter as well (1, 2, 3, or all):

   Examples: `python run_TransformTests.py 2 testfilename.html`
             `python run_TransformTests.py all testfilename.docx`

*Please note, the inputfile for test '1' or 'all' will have a '.docx' extension; for test 2 or 3 the file extension will be '.html'



* * * * *  ADDING TEST FILES, UPDATING VALID FILES  * * * * *
• Add Testfile: If you want to add a new testfile, just drop your .docx in ./files_for_test/full_transform/test_docx_files
• Create Validated Files: To create new validated files for a .docx, just run transforms 1, 2, and 3 for your file as shown in examples above; if a validated file does not exist in the right place during a test, the tmp file from the transform will be moved to the validated files folder.
• Update/Replace Validated Files: To update validated files, you can just delete existing ones and run the corresponding transform test; missing validated files will be replaced by transform output.



* * * * *  USING htmldiff STANDLONE  * * * * *
The ./htmldiff.py can be invoked as a standalone tool to diff non-binary files, or compare non-binary files in 2 directories.
The latter is particularly useful in comparing EPUBs, via diffing HTML in OEBPS dir.
It accepts files with these extensions: ['.xml', '.xhtml', '.html', '.ncx', 'opf', '.css', '.txt']
For filetypes above other than css and txt it prettifies the file (so it's not diffing a single line) and strips unique id values (key for html).

To diff two files, run like so:
    `python htmldiff.py file1 file2`
Diff output will be printed to the console (unless outputdir is specified, as in the next example).

To compare & diff files in 2 different directories, you need to specify one more parameter: an output directory for diff.txt files generated for each diff-able file pair, like so:
    `python htmldiff.py comparedir1 comparedir2 outputdir`
A summary of files with differences will be listed in the console, with diff.txt files for each file pair written to the outputdir.
