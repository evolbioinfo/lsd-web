from Bio import Nexus
from Bio import Phylo
from PIL import Image, ImageDraw, ImageChops, ImageFont
import numpy
import math
import os
import re

class TreeImage:
    """Render a tree into image with good dates"""
    @staticmethod
    def render_png(tree,width,height,out_file):
        level=0
        border=40
        min_y=border
        max_y=height-border
        max_num_disp_years=25
        if height==0:
            tax_space=25
            height=tax_space*(tree.count_terminals()-1)+2*border
        root = tree.node(tree.root)
        point_radius=3
        max_date = TreeImage.get_max_date(tree)
        min_date = TreeImage.get_min_date(tree)
        #print str(min_date)+" "+str(max_date)
        image = Image.new('RGBA', (width,height), (255,255,255,255))
	font_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/../fonts/"
        fnt_large = ImageFont.truetype(font_path+'/DejaVuSans.ttf', 14)
        fnt_small = ImageFont.truetype(font_path+'/DejaVuSans.ttf', 10)
        d = ImageDraw.Draw(image)
        y_dict={}
        TreeImage.y_coords(y_dict,tree,root,height,border,0)
        TreeImage.draw_scale(d,min_date,max_date,width,height,border,fnt_large,max_num_disp_years)
        TreeImage.coordinates(d,tree,root,y_dict,min_date,max_date,width,0,0,border,point_radius,fnt_small,fnt_large)
        image.save(out_file, "PNG")

    @staticmethod
    def coordinates(image_draw,tree,node,y_dict,min_date,max_date,width,prev_x,prev_y,border,point_radius,fnt_small,fnt_large):
        middle=y_dict[node.get_id()]
        # On ajoute les lignes verticales precedentes si non root
        if node.get_id() != tree.root:
            image_draw.line([(prev_x,prev_y),(prev_x,middle)],(0,0,0,255),2)

        # On prend la date et on calcul la position x
        n_date = TreeImage.parse_comment_date(node)
        x_coord= (n_date-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border

        # On affiche le noeud
        image_draw.ellipse([x_coord-point_radius,middle-point_radius,x_coord+point_radius,middle+point_radius],fill=(0,0,0,255))
        
        # On affiche la ligne horizontale
        image_draw.line([(prev_x,middle),(x_coord,middle)],(0,0,0,255),2)

        # On affiche la date du noeud
        year =int(n_date )
        month=n_date-(int)(n_date)
        month=(int)(month*12)+1
        date=str(year)+"/"+str(month).zfill(2)
        tw,th = image_draw.textsize(date, font=fnt_small)
        image_draw.text([x_coord-tw-point_radius,middle-th], date, (0,0,0,255), font=fnt_small)

        # On affiche le nom du noeud
        if(len(node.succ)==0):
            #print(node.data.taxon)
            tw,th = image_draw.textsize(node.data.taxon, font=fnt_large)
            image_draw.text([x_coord+point_radius*2,middle-th/2], node.data.taxon, (0,0,0,255), font=fnt_large)


        # On passe aux suivants
        i=0
        for n in node.succ:
            if i==0:
                TreeImage.coordinates(image_draw,tree,tree.node(n),y_dict,min_date,max_date,width,x_coord,middle, border,point_radius,fnt_small,fnt_large)
            else:
                TreeImage.coordinates(image_draw,tree,tree.node(n),y_dict,min_date,max_date,width,x_coord,middle, border,point_radius,fnt_small,fnt_large)
            i=1

    @staticmethod
    def draw_scale(draw_image,min_date,max_date,width,height,border,f,max_num_disp_years):
        max_year = int(math.ceil(max_date))
        min_year=int(math.floor(min_date))
        mod=int(math.ceil((max_year-min_year)*1.0/max_num_disp_years))
        for year in range(min_year,max_year+1):
            if  year%mod==0:
                #print "Year: "+str(year)
                x_coord= (year-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
                draw_image.line([(x_coord,0),(x_coord,height)],(100,100,100,255),1);
                draw_image.text([x_coord,0], str(year), (100,100,100,255), font=f)

    @staticmethod
    def get_max_date(tree):
        max_date = 0
        if tree.node(tree.root) is not None:
            max_date = TreeImage.max_date_rec(tree,tree.node(tree.root))
        return(max_date)

    @staticmethod
    def max_date_rec(tree,node):
        max_date = 0
        if len(node.succ) == 0:
            return TreeImage.parse_comment_date(node)
        else:
            for n in node.succ:
                max_date = max(max_date,TreeImage.max_date_rec(tree,tree.node(n)))
        return(max_date)

    @staticmethod
    def get_min_date(tree):
        if tree.node(tree.root) is not None:
            return TreeImage.parse_comment_date(tree.node(tree.root))
        else:
            return None
            
    @staticmethod
    def parse_comment_date(node):
        dateStr = re.sub("\[&date=(\d+(\.\d+){0,1})\]", r"\1", node.data.comment)
        return float(dateStr)

    @staticmethod
    def y_coords(y_dict,tree,node,height,border,num_terminal):
        #print "Current term: "+str(num_terminal)
        #print "node: "+str(node.get_id())
        #print "Start: "+str(y_dict)
        if(len(node.succ)>0):
            meany=0
            for n in node.succ:
                #print "succ: "+str(n)
                num_terminal=TreeImage.y_coords(y_dict,tree,tree.node(n),height,border,num_terminal)
                #print "Try: "+str(n)
                meany+=y_dict[n]
            meany=meany*1.0/len(node.succ)
            y_dict[node.get_id()] = meany
        else:
            y_dict[node.get_id()]=num_terminal*((height-2*border)*1.0/(tree.count_terminals()-1))+border
            num_terminal+=1
        #print "End: "+str(y_dict)
        #print "num term: "+str(num_terminal)
        return num_terminal

    @staticmethod
    def main():
        nexusIO = Nexus.Nexus.Nexus("#NEXUS\nBegin trees;\ntree 1 = (((4[&date=2016]:0.0465834,5[&date=2015.57]:0.0241405)[&date=2015.11]:0.0440383,((0[&date=2015.12]:0.041884,1[&date=2015.68]:0.0710232)[&date=2014.32]:0.024068,2[&date=2016]:0.111936)[&date=2013.86]:-0.0210531)[&date=2014.26]:0.0394723,3[&date=2015.69]:0.113981)[&date=2013.51];\nEnd;")
        TreeImage.render_png(nexusIO.trees[0],800,0,"c.png")

