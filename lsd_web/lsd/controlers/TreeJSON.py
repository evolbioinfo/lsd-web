import json
import re
class TreeJSON:
    biopython_tree = None

    def __init__(self,biopython_tree):
        self.biopython_tree = biopython_tree

    def __str__(self):
        json_tree = self.to_serializable(self.biopython_tree.root)
        return self.to_json(json_tree)
        
    def to_serializable(self,node_index):
        n        = self.biopython_tree.node(node_index)
        dateStr  = re.sub("\[&date=(\d+(\.\d+){0,1})\]", r"\1", n.data.comment)
        date_num = float(dateStr)
        year     = int(date_num)
        month    = date_num-(int)(date_num)
        month    = (int)(month*12)+1
        date     = str(year)+"/"+str(month).zfill(2)

        output = {
            "tax"     : n.data.taxon,
            "date_s" : date,
            "date_n" : date_num,
            "brlen"  : n.data.branchlength,
            "id"     : n.get_id(),
            "suc" : []
        }

        for s in n.succ:
            output["suc"].append(self.to_serializable(s))

        return output

    def to_json(self,tree_serializable):
        return json.dumps(tree_serializable)
