# for diffing two xml, xhtml files with unique id's
# if 1st two params are xml/xhtml files in prints diff to cmd line.
# 3rd param should a directory for diff to file
# 1st two params are dirs, then it will expect a third param, and recursively diff
#    files to diffs in output
# optional todo:
#     optionally recurse through structure? (For batch_diff)
#     allow clean other strings by regex, dynamically

import sys, os, re, shutil
import subprocess
from xml.dom import minidom
import time
import inspect

# supported file extensions
prettify_extensions = ['.xml', '.xhtml', '.html', '.ncx', '.opf']
valid_extensions = ['.css', '.txt'] + prettify_extensions

# labels for pretty and fixed files:
pretty_label = '_pretty'
fixed_label = '_fixed'

# key dirs
transform_testfiles_dir = os.path.join(sys.path[0], 'files_for_test', 'full_transform', 'test_docx_files')
validfiles_basedir = os.path.join(sys.path[0], 'files_for_test', 'full_transform', 'validated_output')
tmpdir_base = os.path.join(sys.path[0], 'files_for_test', 'tmp')
diff_outputdir = os.path.join(tmpdir_base, 'diff_outputs_{}'.format(time.strftime("%y%m%d%H%M%S")))

# # # # # # # # # # #   DIFF FUNCTIONS   # # # # # # # # # # #
def getfilenames(dir):
    files = []
    for (dirpath, dirnames, filenames) in os.walk(dir):
        files.extend(filenames)
        break
    return files

def check_file_pair_exist(dir_x_files, dir_y_files):
    x_only_files = []
    file_pairs = []
    for file_x in dir_x_files:
        if ("{}.".format(pretty_label) not in file_x and "{}.".format(fixed_label) not in file_x
            and file_x != '.DS_Store'):
            if file_x in dir_y_files:
                file_pairs.append(file_x)
            else:
                x_only_files.append(file_x)
    return x_only_files, file_pairs


def checkdirs(dir_a, dir_b):
    dir_a_files = getfilenames(dir_a)
    dir_b_files = getfilenames(dir_b)

    a_only_files, file_pairs = check_file_pair_exist(dir_a_files, dir_b_files)
    b_only_files, file_pairs = check_file_pair_exist(dir_b_files, dir_a_files)

    supported_file_pairs = []
    unsupported_ext_files = []
    for fp in file_pairs:
        ext = os.path.splitext(fp)[1]
        if ext in valid_extensions:
            supported_file_pairs.append(fp)
        else:
            unsupported_ext_files.append(fp)

    valid_file_pairs = []
    for sfp in supported_file_pairs:
        if "{}.".format(pretty_label) not in sfp and "{}.".format(fixed_label) not in sfp:
            valid_file_pairs.append(sfp)
    return a_only_files, b_only_files, unsupported_ext_files, valid_file_pairs


def rmExistingFSObject(path):
    if os.path.exists(path):
        try:
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
        except Exception as e:
            errstring = 'Error during "{}", exiting'.format(inspect.stack()[0][3])
            print(errstring, e.message, e.args)
            sys.exit(1)

def getPrettyXml(xml_fname, src_label):
    filename_noext, ext = os.path.splitext(xml_fname)

    src_fname = '{}{}{}'.format(filename_noext, src_label, ext)
    target_fname = '{}{}{}'.format(filename_noext, pretty_label, ext)

    rmExistingFSObject(target_fname)

    xmlstr = minidom.parse(src_fname).toprettyxml()
    with open(target_fname, "wb") as f:
        f.write(xmlstr.encode('utf-8'))
    return target_fname

def cleanFile(xml_fname, src_label):
    filename_noext, ext = os.path.splitext(xml_fname)

    src_fname = '{}{}{}'.format(filename_noext, src_label, ext)
    target_fname = '{}{}{}'.format(filename_noext, fixed_label, ext)

    rmExistingFSObject(target_fname)

    with open(src_fname, "rt") as fin, open(target_fname,'w') as fout:
        for line in fin:
            # to ignore unique id's, we strip them
            newline = re.sub('id="\S+?"', 'id=""', line)
            # newline = re.sub("id=\'\S+?\'", 'id=""', newline) # << optional, for id's with single quotes, as in opf
            newline_b = re.sub('href="#id\S+?"', 'href="#id"', newline)
            # <br> tags from init. htmlmaker aren't valid xml, and
            #   htmlmakertohtmlmaker_js mistakenly adds a closing </br> tag in one test doc. Opening a tix for that as well
            newline_c = newline_b.replace('<br>', '<br/>').replace('</br>', '')
            fout.write(newline_c)
    return target_fname

def diffFiles(file_a, file_b, outputdir):
    cmd_list = ['diff', file_a, file_b]

    if outputdir is None:
        diff_val = subprocess.call(cmd_list)
        outfile = ""
    else:
        # make output dir as needed
        if not os.path.isdir(outputdir):
            os.makedirs(outputdir)

        filename_noext, ext = os.path.splitext(os.path.basename(file_a))
        outfile = os.path.join(outputdir, '{}_{}_diff.txt'.format(filename_noext, ext))
        rmExistingFSObject(outfile)

        f = open(outfile,'a')
        diff_val = subprocess.call(cmd_list, stdout=f)
        f.close()

        # clear out non-useful (blank) diffs
        if diff_val == 0:
            rmExistingFSObject(outfile)

    return diff_val, outfile

def prepareAndDiffFilePair(file_a, file_b, outputdir):
    # see if we need to prettify file:
    filename_ext = os.path.splitext(os.path.basename(file_a))[1]

    if filename_ext in prettify_extensions:
        # second param is file 'label' of src version of file to be picked up
        file_a_fixed = cleanFile(file_a, '')
        file_b_fixed = cleanFile(file_b, '')
        file_a_pretty = getPrettyXml(file_a, fixed_label)
        file_b_pretty = getPrettyXml(file_b, fixed_label)
        # diff the cleaned files
        diff_val, outfile = diffFiles(file_a_pretty, file_b_pretty, outputdir)
    else:
        diff_val, outfile = diffFiles(file_a, file_b, outputdir)
    return diff_val, outfile

def batchDiffInDirs(valid_file_pairs, dir_a, dir_b, outputdir):
    diff_found = []
    # make output dir as needed
    if not os.path.isdir(outputdir):
        os.makedirs(outputdir)
    for vfp in valid_file_pairs:
        diff_val, outfile = prepareAndDiffFilePair(os.path.join(dir_a,vfp), os.path.join(dir_b,vfp), outputdir)
        if diff_val != 0:
            diff_found.append(vfp)

    return diff_found

def runHtmlDiff(file_a, file_b, outputdir):
    # set return var for diff-test use-case:
    b_only_files = []
    # handle single file diff
    if os.path.isfile(file_a) and os.path.isfile(file_b):
        diff_val, outfile = prepareAndDiffFilePair(file_a, file_b, outputdir)
        if outfile:
            if diff_val != 0:
                print("Difference(s) found, diff file is here: {}".format(outfile))
            else:
                print("No differences found")
        else:
            print("Difference(s) found:\n\n{}".format(diff_val))
    # diff all files in two dirs
    elif os.path.isdir(file_a) and os.path.isdir(file_b):
        if outputdir is not None:
            a_only_files, b_only_files, unsupported_ext_files, valid_file_pairs = checkdirs(file_a, file_b)
            print("\n \n PREPARING to diff files in dirs!...\n")
            if a_only_files:
                print("THESE files exist only in the first dir!! ({}):\n\n  {}\n\n".format(file_a, a_only_files))
            if b_only_files:
                print("THESE files exist only in the second dir!! ({}):\n\n  {}\n\n".format(file_b, b_only_files))
            if unsupported_ext_files:
                print("THESE file pairs have unsupported file extensions so we cannot diff them: \n\n   {}\n\n".format(unsupported_ext_files))
            if valid_file_pairs:
                print("THESE file pairs will be diffed, now! : \n\n   {}\n\n".format(valid_file_pairs))
                diff_found = batchDiffInDirs(valid_file_pairs, file_a, file_b, outputdir)
                if diff_found:
                    print("  * * * *  DIFFERENCES FOUND  * * * *")
                    print("Diffs for the following file-pairs can be found in output dir: '{}': \n\n  {}\n\n".format(outputdir, '\n  '.join(diff_found)))
                else:
                    print("  * * * *  No differences detected!  * * * *\n\n")
                    #  rm extraneous outputdir
                    rmExistingFSObject(outputdir)
            elif not valid_file_pairs:
                print("  * * * *  No files to diff here!  * * * *\n\n")
        elif outputdir is None:
            print("\n  You forgot to include an output dir as a 3rd parameter (reqrd for diffing dirs)\n")
    else:
        print("\n  Your first two params need to either both be dirs or both be files\n")
    return b_only_files

if __name__ == '__main__':
    #  taking cmd line arguments for direct runs
    file_a = sys.argv[1]
    file_b = sys.argv[2]

    if len(sys.argv) == 4:
        outputdir = sys.argv[3]
    else:
        outputdir = None

    runHtmlDiff(file_a, file_b, outputdir)
