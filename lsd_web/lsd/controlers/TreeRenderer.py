# from ete3 import Tree, TreeStyle, TextFace, faces, AttrFace
# from ete3.parser import newick
import base64
import os
import shutil
import tempfile
from PIL import Image, ImageChops

from Bio import Phylo
from Bio import Nexus
from TreeImage import TreeImage

import re
class TreeRenderer:
    """Render a tree from newick to String using ETE Toolkit"""

    @staticmethod
    def renderNewick(newickString,widthPx,pdf):
        t = Tree( newickString )
        # Directory where temptree 
        # image will be stored
        tempdir=tempfile.mkdtemp()
        if pdf:
            imageFile=os.path.join(tempdir, "image.svg")
        else:
            imageFile=os.path.join(tempdir, "image.pdf")
        ts = TreeStyle()
        ts.show_leaf_name = True
        ts.show_branch_length = True
        #ts.mode = "c"
        #ts.show_branch_support = True
        newick.set_float_format('%4.2f')
        t.render(imageFile, tree_style=ts, w=widthPx, units="px")
        with open(imageFile, "rb") as image_file:
            if pdf:
                encoded_string = image_file.read()
            else:
                encoded_string = base64.b64encode(image_file.read())
            return(encoded_string)
        shutil.rmtree(tempdir)
        return("")

    @staticmethod
    def renderNexus_own(nexusString,widthPx):
        nexusString = TreeRenderer.replace_comments(nexusString)
        treestring = "#NEXUS\nBegin trees;\ntree 1 = "+nexusString+"\nEnd;\n"
        nexusIO = Nexus.Nexus.Nexus(treestring)
        tempdir=tempfile.mkdtemp()
        image_file=os.path.join(tempdir, "image.png")
        for t in nexusIO.trees:
            TreeRenderer.collapse_null_branches(t,t.node(t.root))
            TreeRenderer.parse_dates(t,t.node(t.root),0)
            TreeRenderer.parse_confidence_intervals(t,t.node(t.root),0,0)
            TreeRenderer.compute_min_max_dates(t,t.node(t.root))
            TreeImage.render_png(t,widthPx,0,image_file)
        with open(image_file, "rb") as image:
            encoded_string = image.read()
            return(encoded_string)
        shutil.rmtree(tempdir)
        return("")

    @staticmethod
    def renderTree(tree,widthPx):
        tempdir=tempfile.mkdtemp()
        imageFile=os.path.join(tempdir, "image.svg")
        ts = TreeStyle()
        ts.show_leaf_name = True
        ts.show_branch_length = True
        #ts.show_branch_support = True
                
        tree.render(imageFile, tree_style=ts, w=widthPx, units="px")
        #TreeRenderer.cropImage(imageFile)
        with open(imageFile, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read())
            return(encoded_string)
        shutil.rmtree(tempdir)
        return("")

    # Replaces the comments [&date=...][&CI=] by [&date=...|CI="min-max"]
    @staticmethod
    def replace_comments(nexusString):
        nstring= nexusString.replace("][&","|")
        nstring = re.sub(r"CI=\"(\d+(\.\d+){0,1})\((\d+(\.\d+){0,1}),(\d+(\.\d+){0,1})\)\"", r'CI="\3-\5"', nstring)
        return nstring

    @staticmethod
    def collapse_null_branches(tree,node):
        childs = [];
        for succ in node.succ :
	    TreeRenderer.collapse_null_branches(tree, tree.node(succ))
	    if tree.node(succ).data.branchlength == 0 and len(tree.node(succ).succ)>0 :
                for succ2 in tree.node(succ).succ:
		    childs.append(succ2);
	    else:
	        childs.append(succ)
        node.succ = childs;

    @staticmethod
    def parse_dates(tree,node,prev_date):
        if node.data.comment:
            dateStr = re.sub(r"\[&date=(-{0,1}\d+(\.\d+){0,1})(\]|\|).*", r"\1", node.data.comment)
            node.date_n = float(dateStr)
        else:
            node.date_n = prev_date
        for succ in node.succ:
            TreeRenderer.parse_dates(tree,tree.node(succ),node.date_n)

    @staticmethod
    def parse_confidence_intervals(tree,node,prev_date_min,prev_date_max):
        if node.data.comment:
            m = re.match(r".*CI=\"(\d+(\.\d+){0,1})-(\d+(\.\d+){0,1})\".*", node.data.comment)
            if(m):
                node.date_min = float(m.group(1))
                node.date_max = float(m.group(3))
            else:
                node.date_min = node.date_n
                node.date_max = node.date_n
        else:
            node.date_min = prev_date_min
            node.date_max = prev_date_max
        for succ in node.succ:
            TreeRenderer.parse_confidence_intervals(tree,tree.node(succ),node.date_min,node.date_max)

    @staticmethod
    def compute_min_max_dates(tree,node):
        if(node == tree.node(tree.root)):
            tree.min_date=min(node.date_n,node.date_min)
            tree.max_date=max(node.date_n,node.date_max)
        else:
            tree.min_date = min(node.date_n, node.date_min, tree.min_date)
            tree.max_date = max(node.date_n, node.date_max, tree.max_date)
            
        for succ in node.succ:
            TreeRenderer.compute_min_max_dates(tree,tree.node(succ))

    @staticmethod
    def cropImage(imagefile):
        image=Image.open(imagefile)
        image.load()
        bg = Image.new(image.mode, image.size, image.getpixel((0,0)))
        diff = ImageChops.difference(image, bg)
        diff = ImageChops.add(diff, diff, 2.0, -100)
        bbox = diff.getbbox()
        cropped=image.crop(bbox)
        cropped.save(imagefile)

    @staticmethod
    def layout(node):
        # If node is a leaf, add the nodes name and a its scientific name
        if node.is_leaf():
            faces.add_face_to_node(AttrFace("name", ftype='Arial', fsize=6, fgcolor='black'),node, column=1)
