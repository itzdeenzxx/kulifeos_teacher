import re

with open("../kulifeos-teacher/src/pages/teacher/ClassroomDetail.tsx", "r") as f:
    content = f.read()

# Find the start and end of the stream tab content
import sys
start_idx = content.find('{/* Stream Tab */}')
end_idx = content.find('{/* Classwork Tab */}')

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end index")
    sys.exit(1)

new_stream_content = """{/* Stream Tab */}
            <TabsContent value="stream" className="mt-0 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-1 md:px-4 text-card-foreground">
                
                {/* Left Sidebar (Desktop only) */}
                <div className="hidden md:flex flex-col gap-5 md:col-span-4 lg:col-span-3">
                  {/* Class Code Card */}
                  <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden text-card-foreground">
                    <CardHeader className="bg-muted/30 pb-3 p-4 flex fleimport re

with open("../kulet
with op       content = f.read()

# Find the start and end of the stream tab content
impor??
# Find the start and>
 import sys
start_idx = content.find('{/* Stream T="start_idxssend_idx = content.find('{/* Classwork Tab */}0 
if start_idx == -1 or end_idx == -1:
    prin
      print("Could not find start orsNa    sys.exit(1)

new_stream_content = """{/* n>
new_stream_co               <TabsContent value="stream" crd              <div className="grid grid-cols-1 md:grid-cols-12 gap-6                   
                {/* Left Sidebar (Desktop only) */}
                <div className="hi                 ss                <div className="hidden md:flex fle??                  {/* Class Code Card */}
                  <Card className="rounded-xl bo       </CardContent>
                  </Ca                    <CardHeader className="bg-muted/30 pb-3 p-4 flex fleimport re

with open("../kulet
with op   der shadow-
with open("../kulet
with op       content = f.read()

# Find the start and end  <Cwith op       cont="
# Find the start and end of ths-cimpor??
# Find the start and>
 import sys
start_i?? ่ก import sys
start_id??tart_idx ?
if start_idx == -1 or end_idx == -1:
    prin
      print("Could not find start orsNa    sys.exitte    prin
      print("Could not fin        p  
new_stream_content = """{/* n>
new_stream_co        >?ew_stream_co               <??                {/* Left Sidebar (Desktop only) */}
                <div className="hi                 ss                <div className="hidden mt                 <div className="hi                10                  <Card className="rounded-xl bo       </CardContent>
                  </Ca                    <CardHeader className="bg-muted/3??                 </Ca                    <CardHeader className="bg-  
with open("../kulet
with op   der shadow-
with open("../kulet
with op       content = f.read()

# Finamewith op   der shad:col-span-9 flex flex-cowith op       cont  
# Find th* Mobile Class Code (Vis# Find the start and end of ths-cimpor??
# Find c# Find the start and>
 import sys
startus import sys
start_i? tstart_i??orstart_id??tart_idx ?
if str if start_idx == -1 ow-    prin
      print("Could not fin        p        print("Could not fin        p  
new_stream_content = "fonew_stream_content = """{/* n>
new_sernew_stream_co        >?ew_s?               <div className="hi                 ss                <div className="hidden mt           on                  </Ca                    <CardHeader className="bg-muted/3??                 </Ca                    <CardHeader className="bg-  
with open("../kulet
with op   der shadow-
with open("../kulet
with   with open("../kulet
with op   der shadow-
with open("../kulet
with op       content = f.read()

# Finamewith op   der shad:col-span-9 flex flex-coouwith op   der shad*/with open("../kulet
<Cwith op       contnd
# Finamewith op   der shad:coldow# Find th* Mobile Class Code (Vis# Find the start and end of ths-cimpdd# Find c# Find the start and>
 import sys
startus import sys
start_i? ts   import sys
startus import smsstartus imp-start_i? tstart_ierif str if start_idx == -1 ow-    prin
    30      print("Could not fin        p   new_stream_content = "fonew_stream_content = """{/* n>
new_sernew_stream_/6new_sernew_stream_co        >?ew_s?                with open("../kulet
with op   der shadow-
with open("../kulet
with   with open("../kulet
with op   der shadow-
with open("../kulet
with op       content = f.read()

# Finamewith op   der shad:col-span-9 flex flex-coouwith op   der shad*/with open("../kulet
<Cwith op       contnd
# Finamewititwith op   der shadbowith open("../kulet
edwith   with open("pywith op   der shadow-
wit  with open("../kulet
  with op       cont="
# Finamewith op   der shad:coled-<Cwith op       contnd
# Finamewith op   der shad:coldow# Find th* Mobile Class Code (Vis#?? Finamewith op   der?? import sys
startus import sys
start_i? ts   import sys
startus import smsstartus imp-start_i? tstart_ierif str if start_idx == -1 o  startus im  start_i? ts   imp/*startus import smsstart *    30      print("Could not fin        p   new_stream_content = "fonew_stream_conten  new_sernew_stream_/6new_sernew_stream_co        >?ew_s?                with open("../kulet
wiclwith op   der shadow-
with open("../kulet
with   with open("../kulet
with op   der shadow-
wi
 with open("../kulet
  with   with open("-4with op   der shadow-
witmswith open("../kulet
  with op       cont <
# Finamewith op   der shad:col2 m<Cwith op       contnd
# Finamewititwith op   der shadbowith open("../kulet
edwith   with ri# Finamewititwith op  redwith   with open("pywith op   der shadow-
wit  wiarwit  with open("../kulet
  with op       crK  with op       cont="
5 # Finamewith op   der  # Finamewith op   der shad:coldow# Find th* Mobile Cla<dstartus import sys
start_i? ts   import sys
startus import smsstartus imp-start_i? tstart_ierif str ifmistart_i? ts   impunstarading-snug">Teacher Pwiclwith op   der shadow-
with open("../kulet
with   with open("../kulet
with op   der shadow-
wi
 with open("../kulet
  with   with open("-4with op   der shadow-
witmswith open("../kulet
  with op       cont <
# Finamewith op   der shad:col2 m<Cwith op       contnd
# Finamewititwith op   der shadbowith open("../sswith open("../kulet
withllwith   with open("ovwith op   der shadow-
wi
-owi
 with open("../ku       with   with open(rtwitmswith open("../kulet
  with op       cun  with op       cont <
  # Finamewith op   der  # Finamewititwith op   der shadbowith open("../kulet
e
 edwith   with ri# Finamewititwith op  redwith   wit  wit  wiarwit  with open("../kulet
  with op       crK  with op       cont="
5 # Fgg  with op       crK  with op    ar5 # Finamewith op   der  # Finamewith oporstart_i? ts   import sys
startus import smsstartus imp-start_i? tstart_ierif str ifmistarr classNamestartus import smsstartrowith open("../kulet
with   with open("../kulet
with op   der shadow-
wi
 with open("../kulet
  with   with open("-4with op   dersmwith   with open("rywith op   der shadow-
wi
  wi
 with open("../kusr ="  with   with open(r.witmswith open("../kulet
  with op       cou  with op       cont <
  # Finamewith op   der  # Finamewititwith op   der shadbowith open("../sswith   withllwith   with open("ovwith op   der shadow-
wi
-owi
 with open(>
wi
-owi
 with open("../ku       with   with opt--15 wi m  with op       cun  with op       cont <
  # Finamewith op   der     # Finamewith op   der  # Finamewititwi[1e
 edwith   with ri# Finamewititwith op  redwith   wit  wit  wiarwit  with o      with op       crK  with op       cont="
5 # Fgg  with op       crK  with op    ar5 #cl5 # Fgg  with op       crK  with op    a-fstartus import smsstartus imp-start_i? tstart_ierif str ifmistarr classNamestartus import smsstartrowith oBuwith   with open("../kulet
with op   der shadow-
wi
 with open("../kulet
  with   with open("-4with op   dersmwith   wenwith op   der shadow-
wi
 pwi
 with open("../ku m :t  with   with open(rewi
  wi
 with open("../kusr ="  with   with open(r.witmswith open("../kulet
       wi    with op       cou  with op       cont <
  # Finamewith op   der ? # Finamewith op   der  # Finamewititwi?i
-owi
 with open(>
wi
-owi
 with open("../ku       with   with opt--15 wi m  with op       cun  with op       con           กร wi?i
-owi
 wi??-?? wi? # Finamewith op   der     # Finamewith op   der  # Finamewititwi[1e
 edwith   with ri#??edwith   with ri# Finamewititwith op  redwith   wit  wit  wiarwit  ? # Fgg  with op       crK  with op    ar5 #cl5 # Fgg  with op       crK  with op    a-fstartus import smsstartus imp-??with op   der shadow-
wi
 with open("../kulet
  with   with open("-4with op   dersmwith   wenwith op   der shadow-
wi
 pwi
 with open("../ku m :t  with   with open(rewi
  wi
 with open("../kusr ="  with   with open(r.witm?i
 with open("../ku?? ??  with   with open(??wi
 pwi
 with open("../ku m :t  with   with open(rewi
ลย
            wi    wi
 with open("../kusr ="  with   with ope   wi/*       wi    with op       cou  with op       cont <
  # Finamewitas  # Finamewith op   der ? # Finamewith op   der  ol-owi
 with open(>
wi
-owi
 with open("../ku       with   with opt--15ce wir wi
-owi
 wiwe-n  wit--owi
 wi??-?? wi? # Finamewith op   der     # Finamewith op   der  # Finamewititwi[1e
 edwith   with ri#????wi?? edwith   with ri#??edwith   with ri# Finamewititwith op  redwith   wit  wit  wi  wi
 with open("../kulet
  with   with open("-4with op   dersmwith   wenwith op   der shadow-
wi
 pwi
 with open("../ku m :t  with   with open(rewi
  wi
 with open("../kusr ="  with   with open(r.witm?i
 with open("../ku?? ??  wi c as  with   with open(erwi
 pwi
 with open("../ku m :t  with   with open(rewi
  wi
 with opac  c wisN  wi
 with open("../kusr ="  with   with opek>
     with open("../ku?? ??  with   with open(??wi
 pwi   pwi
 with open("../ku m :t  with   with ope   wi  ลย
            wi    wi
 with open("../kte     se with open("../ku      # Finamewitas  # Finamewith op   der ? # Finamewith op   der  ol-owi
 with open(>
wi
-owi
 wi</ with open(>
wi
-owi
 with open("../ku       with   with opt--15ce wir t-wi
-owi
 wiro-nd wi2 -owi
 wiwe-n  wit--owi
 wi??-?? wi? # Finamewith /d wi
  wi??-?? wi? #   edwith   with ri#????wi?? edwith   with ri#??edwith   with ri# Finamewititwit?with open("../kulet
  with   with open("-4with op   dersmwith   wenwith op   der shadow-
wi
 pwi
 with open("..    with   with open(  wi
 pwi
 with open("../ku m :t  with   with open(rewi
  wi
 with op c as wime  wi
 with open("../kusr ="  with   with ope
  wi   with open("../ku?? ??  wi c as  with   with open(bo pwi
 with open("../ku m :t  with   with open(rewi
     wi    wi
 with opac  c wisN  wi
 withc="https://ap wiic with open("../kusr =st     with open("../ku?? ??  with   with 0" pwi   pwi
 with open("../ku m :t  with   with ock with opear            wi    wi
 with open("../kte     se with   with open("../kte    with open(>
wi
-owi
 wi</ with open(>
wi
-owi
 with open("../ku       with   withover:bg-muted/40 transition-colors rowi
-owi
 wiov-rf wi-hwi
-owi
 with opin:ri wi2 -owi
 wiro-nd wi2 -owi
 wiwe-n  wit--owi
 wi??-?? wi?r wi0" wiwe-n  wit--ow   wi??-?? wi? #in  wi??-?? wi? #   edwith   wit? with   with open("-4with op   dersmwith   wenwith op   der shadow-
wi
 pwi
 with open("..    with   with open(  wi
 pwiutwi
 pwi
 with open("..    with   with open(  wi
 pwi
 with open(".. f nt widi pwi
 with open("../ku m :t  with   wi<B wion  wi
 with op c as wime  wi
 with open("../kw- wiex with ary rounded-full   wi   with open("../ku?? ??  wi c as    with open("../ku m :t  with   with open(rewi
     wi    wi
 id     wi    wi
 with opac  c wisN  wi
 withc==" with opac  ="currentColor" strokeWid with open("../ku m :t  with   with ock with opear            wi    wi
 with open("../kte     se ne with open("../kte     se with   with open("../kte    with open(>
wi
  wi
-owi
 wi</ with open(>
wi
-owi
 with open("../ku       with  iv-
  wi  wi
-owi
 with op  - < wiv>-owi
 wiov-rf wi-hwi
-owi
 with opin:ri wi2 -owi
 wiro-nd wi2 -owi
 wiwe-   wi  -owi
 with opigg wite wiro-nd wi2 -owi
 wi < wiwe-n  wit--owr> wi??-?? wi?r w <wi
 pwi
 with open("..    with   with open(  wi
 pwiutwi
 pwi
 with open("..    with   with open(  wi
 pwi
 with open(".. f nt widi pwi
 with open("../ku m ./ ul wios pwiutwi
 pwi
 with open("..    with  ta pwi
 w,  wi)  pwi
 with open(e(content)

