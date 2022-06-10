
import datetime as dt
from io import StringIO
import hashlib
import re

def hash_value(val: str) -> str:
    return hashlib.md5(val.encode()).hexdigest()

def add_param(html_param, cb):
    return html_param[0: len(html_param) - 1] + f"?cb={cb}" + "\""

if __name__ == "__main__":

    cb_value = hash_value(dt.datetime.now().isoformat())
    js_patt = re.compile(r'src=\"js\/[a-z_]+\.js\"')
    css_patt = re.compile(r'href=\"css\/[a-z_]+\.css\"')

    with open("build/index.html") as rh:
        html = rh.read()

    outText = StringIO()

    for line in html.split("\n"):
        js_m = js_patt.search(line)
        css_m = css_patt.search(line)
        if js_m:
            html_param = js_m.group()
            new_line = line.replace(html_param, add_param(html_param, cb_value))
            outText.write(new_line + "\n")
            print("adding CB to line " + line.replace(' ', ''))
        elif css_m:
            html_param = css_m.group()
            new_line = line.replace(html_param, add_param(html_param, cb_value))
            outText.write(new_line + "\n")
            print("adding CB to line " + line.replace(' ', ''))
        else:
            outText.write(line + "\n")

    with open("build/index.html", "w") as wh:
        wh.write(outText.getvalue())