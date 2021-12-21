# uses htmldiff and jsTransforms functions to run this repo's transforms and diff outputs
#   against known-good files
# see README in this dir for more info
import sys, os
import subprocess
import inspect
import time
import shutil

import jsTransforms as jst
import htmldiff as hdiff

# key dirs
transform_testfiles_dir = os.path.join(sys.path[0], 'files_for_test', 'test_docx_files')
validfiles_basedir = os.path.join(sys.path[0], 'files_for_test', 'validated_output')
valid_htmlmaker_output = os.path.join(validfiles_basedir, 'htmlmaker')
valid_htmltohtmlbook_output = os.path.join(validfiles_basedir, 'htmltohtmlbook')
valid_generateTOC_output = os.path.join(validfiles_basedir, 'generateTOC')
tmpdir_base = os.path.join(sys.path[0], 'files_for_test', 'tmp')
diff_outputdir = os.path.join(tmpdir_base, 'diff_outputs_{}'.format(time.strftime("%y%m%d%H%M%S")))

# dict for running transforms
transforms_dict = {
    '1': {
        'input_dir':transform_testfiles_dir,
        'input_file_ext':'.docx',
        'outputdir_name':'test_1_htmlbook_only',
        'output_compare_dir':valid_htmlmaker_output,
        'xform_function':jst.runHtmlmaker
    },
    '2': {
        'input_dir':valid_htmlmaker_output,
        'input_file_ext':'.html',
        'outputdir_name':'test_2_html2htmlbook_only',
        'output_compare_dir':valid_htmltohtmlbook_output,
        'xform_function':jst.setupAndRunHtmltohtmlbook
    },
    '3': {
        'input_dir':valid_htmltohtmlbook_output,
        'input_file_ext':'.html',
        'outputdir_name':'test_3_generateTOC_only',
        'output_compare_dir':valid_generateTOC_output,
        'xform_function':jst.setupAndGenerateTOC
    },
    'all': {
        'input_dir':transform_testfiles_dir,
        'input_file_ext':'.docx',
        'outputdir_name':'test_4_testALL',
        'output_compare_dir':valid_generateTOC_output,
        'xform_function':jst.runAllTransforms
    },
}

# # # # # # # # # # #   TRANSFORM FUNCTIONS   # # # # # # # # # # #
def recreateOutputDir(dirname):
    hdiff.rmExistingFSObject(dirname)
    os.makedirs(dirname)

def transformFilesInDir(transform_selection, solo_file=None):
    try:
        # (rm & re)create output dir
        outputdir = os.path.join(tmpdir_base, transforms_dict[transform_selection]['outputdir_name'])
        recreateOutputDir(outputdir)
        # run for single file as requested
        if solo_file is not None:
            filepath = os.path.join(transforms_dict[transform_selection]['input_dir'], solo_file)
            # run xform_function
            transforms_dict[transform_selection]['xform_function'](filepath, outputdir)
        else:
            for file in os.listdir(transforms_dict[transform_selection]['input_dir']):
                # screen for files with expected file ext, also not including '_pretty', "_fixed" working files
                if file.endswith(transforms_dict[transform_selection]['input_file_ext']) and hdiff.pretty_label not in file and hdiff.fixed_label not in file:
                    filepath = os.path.join(transforms_dict[transform_selection]['input_dir'], file)
                    # run xform_function
                    transforms_dict[transform_selection]['xform_function'](filepath, outputdir)
        return outputdir, transforms_dict[transform_selection]['output_compare_dir']
    except Exception as e:
        errstring = 'Error during "{}", exiting'.format(inspect.stack()[0][3])
        print(errstring, e.message, e.args)
        sys.exit(1)

def addValidFiles(new_validHtmlFiles, valid_output_dir, tmp_output_dir):
    if new_validHtmlFiles:
        for newfile in new_validHtmlFiles:
            src_filepath = os.path.join(tmp_output_dir, newfile)
            dest_filepath = os.path.join(valid_output_dir, newfile)
            shutil.copyfile(src_filepath, dest_filepath)
        print("\n(( Added missing valid files for the following testfile(s), they will be available for the next test: ))\n  {}\n".format(new_validHtmlFiles))

if __name__ == '__main__':
    # accept parameters for which transform you want to test, or all transforms (no param defaults to 'all')
    if len(sys.argv) > 1:
        test_id = sys.argv[1]
        if test_id != '1' and test_id != '2' and test_id != '3' and test_id != 'all':
            print("second parameter must indicate what test you want to run: 1, 2, 3 or 'all'.")
    else:
        test_id = 'all'
    if len(sys.argv) == 3:
        solo_file = sys.argv[2]
    else:
        solo_file = None

    # transform files
    tmp_output_dir, valid_output_dir = transformFilesInDir(test_id, solo_file)
    # run diffs
    new_validHtmlFiles = hdiff.runHtmlDiff(valid_output_dir, tmp_output_dir, diff_outputdir)
    # add new tmp files as valid files where valid files are not present
    addValidFiles(new_validHtmlFiles, valid_output_dir, tmp_output_dir)
