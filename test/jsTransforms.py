# for invoking htmlmaker_js_rsuite transforms via python
import sys, os, inspect
import subprocess
import shutil

# key local paths
# JS tools and their reqrd files
htmlmaker_bin = os.path.join(sys.path[0], '..', 'bin', 'htmlmaker')
htmltohtmlbook_js = os.path.join(sys.path[0], '..', 'lib', 'htmltohtmlbook.js')
generateTOC_js = os.path.join(sys.path[0], '..', 'lib', 'generateTOC.js')
styles_json = os.path.join(sys.path[0], '..', 'styles.json')
stylefunctions_js = os.path.join(sys.path[0], '..', 'style-functions.js')

# # # # # # # # # # #   TRANSFORM FUNCTIONS   # # # # # # # # # # #
def runHtmlmaker(infile, outputdir):
    try:
        args = ['node', htmlmaker_bin, infile, outputdir, styles_json, stylefunctions_js]
        result = subprocess.call(args)
        # comment here \/ if output is too noisy
        print(result)
        if result != 0:
            print('non-zero exit for {}'.format(htmlmaker_bin))
            raise
    except Exception as e:
        errstring = 'Error during "{}", exiting'.format(inspect.stack()[0][3])
        print(errstring, e.message, e.args)
        sys.exit(1)

def runHtmltohtmlbook(file):
    try:
        args = ['node', htmltohtmlbook_js, file]
        result = subprocess.call(args)
        # comment here \/ if output is too noisy
        print(result)
        if result != 0:
            print('non-zero exit for {}'.format(htmltohtmlbook_js))
            raise
    except Exception as e:
        errstring = 'Error during "{}", exiting'.format(inspect.stack()[0][3])
        print(errstring, e.message, e.args)
        sys.exit(1)

def setupAndRunHtmltohtmlbook(file, outputdir):
    tmp_file = os.path.join(outputdir, os.path.basename(file))
    shutil.copyfile(file, tmp_file)
    runHtmltohtmlbook(os.path.join(outputdir, tmp_file))

def runGenerateTOC(file):
    try:
        args = ['node', generateTOC_js, file]
        result = subprocess.call(args)
        # comment here \/ if output is too noisy
        print(result)
        if result != 0:
            print('non-zero exit for {}'.format(generateTOC_js))
            raise
    except Exception as e:
        errstring = 'Error during "{}", exiting'.format(inspect.stack()[0][3])
        print(errstring, e.message, e.args)
        sys.exit(1)

def setupAndGenerateTOC(file, outputdir):
    tmp_file = os.path.join(outputdir, os.path.basename(file))
    shutil.copyfile(file, tmp_file)
    runGenerateTOC(os.path.join(outputdir, tmp_file))

def runAllTransforms(infile, outputdir):
    runHtmlmaker(infile, outputdir)
    infile_basename = os.path.splitext(os.path.basename(infile))[0]
    htmlfile = os.path.join(outputdir, '{}.html'.format(infile_basename))
    runHtmltohtmlbook(htmlfile)
    runGenerateTOC(htmlfile)

if __name__ == '__main__':
    infile = sys.argv[1]
    outputdir = sys.argv[2]

    # runHtmlmaker(infile, outputdir)
    # runHtmltohtmlbook(file)
    # runGenerateTOC(file)
    runAllTransforms(infile, outputdir)
