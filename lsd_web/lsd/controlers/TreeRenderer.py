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
    def renderNexus(nexusString,widthPx,pdf):
        newickString = re.sub("\[&date=(\d+(\.\d+){0,1})\](:-{0,1}\d*(\.\d+){0,1}){0,1}", r":\1", nexusString)
        
        t = Tree( newickString )
        # Directory where temptree 
        # image will be stored
        tempdir=tempfile.mkdtemp()
        if(pdf):
            imageFile=os.path.join(tempdir, "image.pdf")
        else:
            imageFile=os.path.join(tempdir, "image.svg")
        ts = TreeStyle()
        ts.show_leaf_name = False
        ts.layout_fn = TreeRenderer.layout
        #ts.show_branch_length = True
        #ts.show_branch_support = True
        #ts.mode = "c"
        #ts.mode = "c"
        #ts.arc_start = -180 # 0 degrees = 3 o'clock
        #ts.arc_span = 180
        #ts.legend=False
        ts.show_scale=False

        # On ajoute les dates aux noeuds
        for n in t.traverse():
            date=n.dist
            month=n.dist-(int)(n.dist)
            month=(int)(month*12)+1
            n.add_face(TextFace(str(month).zfill(2)+"/"+str((int)(date)),ftype='Arial', fsize=5, fgcolor='black', fstyle='italic', tight_text=True),column=1)
            
        t.render(imageFile, tree_style=ts, w=widthPx, units="px")
        #TreeRenderer.cropImage(imageFile)
        with open(imageFile, "rb") as image_file:
            if pdf:
                encoded_string = image_file.read()
            else:
                encoded_string = base64.b64encode(image_file.read())
            return(encoded_string)
        shutil.rmtree(tempdir)
        return("")

    @staticmethod
    def renderNexus_own(nexusString,widthPx,pdf):
        treestring = "#NEXUS\nBegin trees;\ntree 1 = "+nexusString+"\nEnd;\n"
        nexusIO = Nexus.Nexus.Nexus(treestring)
        tempdir=tempfile.mkdtemp()
        image_file=os.path.join(tempdir, "image.png")
        for t in nexusIO.trees:
            TreeImage.render_png(t,widthPx,0,image_file)
        with open(image_file, "rb") as image:
            encoded_string = base64.b64encode(image.read())
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


    # @staticmethod
    # def getTreesFromNexus(nexusString):
    #     trees = []
    #     tempdir=tempfile.mkdtemp()
    #     nexusFile=os.path.join(tempdir, "tree.nx")
    #     phyloxmlFile=os.path.join(tempdir, "tree.xml")
    #     imageFile=os.path.join(tempdir, "image.png")
    #     f = open(nexusFile, 'w')
    #     f.write(nexusString)
    #     f.write("\n");
    #     f.close()
    #     nexusIO = Nexus.Nexus.Nexus(nexusFile)
    #     #nexusTree = Phylo.read(nexusFile, 'nexus')
    #     Phylo.write(nexusIO.trees, phyloxmlFile,'phyloxml')
        
    #     #Phylo.convert(nexusFile, 'nexus', phyloxmlFile, 'phyloxml')

    #     print phyloxmlFile
    #     xml_project = Phyloxml()
    #     xml_project.build_from_file(phyloxmlFile)
    #     for tree in xml_project.get_phylogeny():
    #         trees.append(tree)

    #     shutil.rmtree(tempdir)
    #     return(trees)

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
