from ete3 import Tree, TreeStyle, TextFace
from ete3.parser import newick
import base64
import os
import shutil
import tempfile
#from Bio import Phylo
#from ete3 import Phyloxml
#from Bio import Nexus
#from Bio.Phylo import PhyloXMLIO
import re
class TreeRenderer:
    """Render a tree from newick to String using ETE Toolkit"""

    @staticmethod
    def renderNewick(newickString,widthPx):
        t = Tree( newickString )
        # Directory where temptree 
        # image will be stored
        tempdir=tempfile.mkdtemp()
        imageFile=os.path.join(tempdir, "image.png")
        ts = TreeStyle()
        ts.show_leaf_name = True
        ts.show_branch_length = True
        #ts.mode = "c"
        #ts.show_branch_support = True
        newick.set_float_format('%4.2f')
        t.render(imageFile, tree_style=ts, w=widthPx, units="px")
        with open(imageFile, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read())
            return(encoded_string)
        shutil.rmtree(tempdir)
        return("")

    @staticmethod
    def renderNexus(nexusString,widthPx):
        newickString = re.sub("\[&date=(\d+(\.\d+){0,1})\](:\d*(\.\d+){0,1}){0,1}", r":\1", nexusString)
        
        t = Tree( newickString )
        # Directory where temptree 
        # image will be stored
        tempdir=tempfile.mkdtemp()
        imageFile=os.path.join(tempdir, "image.png")
        ts = TreeStyle()
        ts.show_leaf_name = True
        #ts.show_branch_length = True
        #ts.show_branch_support = True
        #ts.mode = "c"

        # On ajoute les dates aux noeuds
        for n in t.traverse():
            n.add_face(TextFace(str(n.dist)),column=0)

        t.render(imageFile, tree_style=ts, w=widthPx, units="px")
        with open(imageFile, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read())
            return(encoded_string)
        shutil.rmtree(tempdir)
        return("")

    @staticmethod
    def renderTree(tree,widthPx):
        tempdir=tempfile.mkdtemp()
        imageFile=os.path.join(tempdir, "image.png")
        ts = TreeStyle()
        ts.show_leaf_name = True
        ts.show_branch_length = True
        #ts.show_branch_support = True
                
        tree.render(imageFile, tree_style=ts, w=widthPx, units="px")
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
