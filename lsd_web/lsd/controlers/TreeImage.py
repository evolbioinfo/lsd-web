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
        point_radius=2
        max_date = tree.max_date
        min_date = tree.min_date
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
        # On prend la date et on calcul la position x
        n_date = node.date_n
        x_coord= (n_date-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border

        x_min_coord = (node.date_min-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border
        x_max_coord = (node.date_max-min_date) * (width-2*border) * 1.0 / (max_date-min_date)+border

        # On affiche la ligne horizontale de Confidence Interval
        #image_draw.line([(x_min_coord,middle),(x_max_coord,middle)],(51,193,95,255),4)
        if not(node.date_min == node.date_max):
            TreeImage.rounded_line(image_draw,x_min_coord,middle,x_max_coord,middle,(51,193,95,255),4)

        # On ajoute les lignes verticales precedentes si non root
        if node.get_id() != tree.root:
            image_draw.line([(prev_x,prev_y),(prev_x,middle)],(0,0,0,255),2)
        
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
    def rounded_line(image_draw,x1,y1,x2,y2,color,width):
        image_draw.line([(x1,y1),(x2,y2)],color,width)
        w=math.floor(width/2)
        image_draw.ellipse((x1 - w+1, y1 - w+1, x1 + w -1, y1 + w ), fill=color, outline=None)
        image_draw.ellipse((x2 - w+1, y2 - w+1, x2 + w -1, y2 + w ), fill=color, outline=None)

    
    @staticmethod
    def main():
        nexusIO = Nexus.Nexus.Nexus("#NEXUS\nBegin trees;\ntree 1 = (((4[&date=2016]:0.0465834,5[&date=2015.57]:0.0241405)[&date=2015.11]:0.0440383,((0[&date=2015.12]:0.041884,1[&date=2015.68]:0.0710232)[&date=2014.32]:0.024068,2[&date=2016]:0.111936)[&date=2013.86]:-0.0210531)[&date=2014.26]:0.0394723,3[&date=2015.69]:0.113981)[&date=2013.51];\nEnd;")
        TreeImage.render_png(nexusIO.trees[0],800,0,"c.png")

