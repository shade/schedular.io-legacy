/* CORE STUFF */

CORE    =   {
    ajax:$,
    currentCRNs:[],
    raw_data:localStorage["RAW_COURSE_DATA"],
    main:{
        fixUrl:{},
        fetch:{},
        parse:{},
    },
    schedule:{
        container:'',
        blockClick:{},
        makeBlock:{},
        generate:{}
    },
    crnMap:{},
    helper:{
        time:{},
        color:{},
        element:{}
    },
    view:{
        crnInput:{},
        crnBar:{}
    }
};


CORE.main.fetch =   (function(CORE){
        //Fetches the data that is needed
    return function(CRNarray,cb){
        CORE.ajax.get({
            url:'/s/fetch?crns='+JSON.stringify(CRNarray.map(Number)),
            done:function(data){
                //put this data as the "raw data"
                localStorage["RAW_COURSE_DATA"]=JSON.stringify(data);
                CORE.raw_data=localStorage["RAW_COURSE_DATA"];
                //make this the new localstorage stuff
                
                cb&&cb();
            }
        });
    };
})(CORE);

CORE.main.parse =   (function(CORE){
    return {
        start:function(){
            
            CORE.raw_data   =   JSON.parse(CORE.raw_data);  
            CORE.raw_data.forEach(function(timeSection,index,raw_data){
            
                timeSection.instructor  =   timeSection.instructor.slice(0,-1);
                timeSection.endTime =   CORE.helper.time.getMinutes(timeSection.endTime);
                timeSection.startTime =   CORE.helper.time.getMinutes(timeSection.startTime);
                
                    var timeSectionJSON =   {
                        startTime   :   timeSection.startTime,
                        endTime     :   timeSection.endTime,
                        day         :   timeSection.days,
                        instructor  :   timeSection.instructor
                    };

                if(timeSectionJSON.day=='-1') //If this is an online course
                    timeSectionJSON.day    =   [-1];
                else
                    timeSectionJSON.day    =   timeSectionJSON.day.split('').map(Number);  //split into days convert to Ints and store

                if(CORE.crnMap[timeSection.CRN]===undefined){
                    CORE.crnMap[timeSection.CRN]    =   {
                        courseName:timeSection.subject+timeSection.code,
                        lab:(timeSection.section.indexOf('#')!==-1),
                        crn:timeSection.CRN,
                        courseId:timeSection.id,
                        section:timeSection.section,
                        campus:timeSection.campus,
                        times:[timeSectionJSON],
                        students:{
                            enrolled:0,
                            waitlisted:0,
                            max:0
                        }
                    }
                }else{
                    if(CORE.crnMap[timeSection.CRN].times.every(function(a){
                       return JSON.stringify(a)!==JSON.stringify(timeSectionJSON)
                    }))
                    CORE.crnMap[timeSection.CRN].times.push(timeSectionJSON);
                }
            });
        }
    };
})(CORE);

/* 

    Helper Functions
    - Same as show.main helper functions
    
*/


CORE.helper.time    =   (function(CORE){
    return {
        getTime:function(minutes){
            var hour    =   parseInt(minutes/60);
            var minutes =   minutes%60;
            if(hour>12)
                return [(hour-12),':',minutes,' pm'].join('');
            else
                return [hour,':',minutes,' am'].join('');

        },
        getMinutes:function(time){
            var time = time.split(':');
            return parseInt(time[0])*60+parseInt(time[1])*1;
        },
        inTime:function(start,end,start2,end2){
            if(isNaN(start)||isNaN(start2))
                return false;
            if ((((start2>=start)&&(start2<end))||((end2>start)&&(end2<end)))||(((start>=start2)&&(start<end2))||((end>start2)&&(end<end2))))
                return true;
            return false;
        },
        sameDay:function(day1,day2){
            if(day1[0]===-1||day2[0]===-1)
                    return false;
            for (var i = 0; i < day1.length; i++) {
                if (day2.indexOf(day1[i]) > -1) {
                    return true;
                }
            }
            return false;
        }
    }
})(CORE);

CORE.helper.color   =   (function(CORE){
    return {
        changeTint:function(hex, lum) {
                // validate hex string
                hex = String(hex).replace(/[^0-9a-f]/gi, '');
                if (hex.length < 6) {
                    hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
                }
                lum = lum || 0;

                // convert to decimal and change luminosity
                var rgb = "", c, i;
                for (i = 0; i < 3; i++) {
                    c = parseInt(hex.substr(i*2,2), 16);
                    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
                    rgb += ("00"+c).substr(c.length);
                }

                return rgb;
        },
        getTextColor:function(code){
            code    =   code.substr(1);
            var r = parseInt(code.substr(0,2),16);
            var g = parseInt(code.substr(2,2),16);
            var b = parseInt(code.substr(4,2),16);

           var nThreshold = 105;
           var bgDelta = (r * 0.299) + (g * 0.587) + (b * 0.114);

           return ((255 - bgDelta) < nThreshold) ? "#222222" : "#ffffff";   
        },
        getBackgroundColor:function(code){
            return "#"+this.changeTint(
                ('000000'+(
                    parseInt(
                        parseInt(code, 36)
                        .toExponential()
                        .slice(2,-5), 10) & 0xFFFFFF)
                 .toString(16)
                 .toUpperCase())
                .slice(-6),0.1);
        }
    };
})(CORE);

CORE.helper.element =  (function(CORE){
    return {
        changeStyle:function(element,styles){
            for(var attributes in styles)
                element.style[attributes]=styles[attributes];
        },
        createDiv:function(attributes){
            var element =   document.createElement('div');
            for(var attributeName in attributes)
                element.setAttribute(attributeName,attributes[attributeName]);
            return element;
        }
    }
})(CORE);


/*


    Schedule module
    - Anything related to how the schedule should look


*/

CORE.search =   (function(CORE){
    return {
            matchCurrent:function(section){
                if(CORE.currentCRNs.indexOf(section.crn.toString())!==-1)
                    return true;
                
                if(!CORE.search.findAll){
                    var scheduleI   =   CORE.currentCRNs.length;
                    while(scheduleI--){
                        var timeCI =   CORE.crnMap[CORE.currentCRNs[scheduleI]].times.length;
                        while(timeCI--){
                            var timeSI =   section.times.length;
                            while(timeSI--){
                                var sSTime =   section.times[timeSI];
                                var cSTime =   CORE.crnMap[CORE.currentCRNs[scheduleI]].times[timeCI];
                                //If any intersects exists between the times of sSTime or cSTime exit.
                                if(CORE.helper.time.sameDay(sSTime.day,cSTime.day)&&CORE.helper.time.inTime(sSTime.startTime,sSTime.endTime,cSTime.startTime,cSTime.endTime))
                                    return true;
                            }
                        }
                    }
                    return false;
                }
            },
        findAll:false
        };
})(CORE);
CORE.schedule   =   (function(CORE){
    return {
        container:document.getElementById('b-timeBlockWrap'),
        regrow:function(){
            [].forEach.call(document.getElementsByClassName('b-timeBlock'),function(block){
                if(block.classList.contains('tempBlock'))
                    return;
                var top = parseInt(block.getAttribute('data-top'));
                var left = parseInt(block.getAttribute('data-left'));
                conflicts   =   [].slice.call(document.querySelectorAll('[data-top="'+top+'"][data-left="'+left+'"]'));
                conflicts = conflicts.filter(function(v){return block!==v});
                conflicts.forEach(function(v,i,a){
                    v.style.width=(85/(conflicts.length+1))+'px';
                    v.style.left=(left+(((85/(conflicts.length+1)))*(i+1)))+'px';
                });
                block.style.width=(85/(conflicts.length+1))+'px';
                block.style.left=left+'px';
            });
        },
        blockBlur:function(element){
            var possible = element.getAttribute('data-possibleUniq');
            var killNodes   =   function(e){
                if(e.target.getAttribute('data-possibleActive')=='true')
                    return;
                var v = document.getElementsByClassName('tempBlock');
                while(v.length){
                    v[0].parentNode.removeChild(v[0]);
                }
                element.setAttribute('data-possibleActive','false');
                document.removeEventListener('mousedown',killNodes);
                CORE.schedule.regrow();
            }
            document.addEventListener('mousedown',killNodes);
            
        },
        blockOver:function(e){
            var section = e.target.getAttribute('data-sectionId');
            [].forEach.call(document.querySelectorAll('[data-sectionID="'+section+'"]'),function(possible,i,a){
                possible.style.boxShadow    =   '0px 0px 3px #000';
                possible.style.opacity      =   1;
            });
        },
        blockOut:function(e){
            var section = e.target.getAttribute('data-sectionId');
            [].forEach.call(document.querySelectorAll('[data-sectionID="'+section+'"]'),function(possible,i,a){
                possible.style.boxShadow    =   '';
                possible.style.opacity      =   .3;
            });
        },
        blockClick:function(e){
            if(e.target.getAttribute('data-possibleActive')=='true')
                return;
            //Make a courseMatch array
            var courseMatch =   [];
            //get current section
            var currentSection  =   CORE.crnMap[e.target.getAttribute('data-crn')];
            //get current crn
            var currentCrn  =   e.target.getAttribute('data-crn');
            for(var crn in CORE.crnMap){
                if(currentSection.courseName==CORE.crnMap[crn].courseName&&currentSection.lab==CORE.crnMap[crn].lab){
                    // if the element has the same course name and lab as clicked element put it in array
                    courseMatch.push(CORE.crnMap[crn]);
                }
            }
            var builderWrap =   document.getElementsByClassName('b-timeBlockWrap')[0];
            
            //Make a uniq id for the section
            var uniq    =   Math.random();
            
            //Add uniq id to clicked element
            e.target.setAttribute('data-possibleUniq',uniq);
            //Set Attribute to true
            e.target.setAttribute('data-possibleActive','true');
            //This is last commit for the day
            //Go through all the matched sections
            courseMatch.forEach(function(section,index,array){
                if(!CORE.search.matchCurrent(section)){
                    var sectionUniq =   Math.random();
                    section.times.forEach(function(time,index,array){
                        time.day.forEach(function(day,index,array){
                            
                            //make translucent blocks and add them to the schedule all with a uniq id to the group.
                            var block = CORE.schedule.makeBlock(section,time,day);
                            CORE.helper.element.changeStyle(block,{
                                opacity:.3
                            });
                            block.addEventListener('mousedown',function(e){
                                block.classList.remove('tempBlock');
                                var urlCRNs =   document.location.hash.substr(1).split('.');
                                [].forEach.call(document.querySelectorAll('[data-crn="'+currentCrn+'"]'),function(v,i,a){
                                    v.parentNode.removeChild(v);
                                });
                                urlCRNs.splice(urlCRNs.indexOf(currentCrn),1,section.crn);
                                CORE.currentCRNs.splice(CORE.currentCRNs.indexOf(currentCrn),1,section.crn.toString());
                                document.location.hash  =   urlCRNs.join('.');
                                CORE.schedule.container.innerHTML='';
                                var crnBlock    =   document.querySelectorAll('[data-crnSpan="'+currentCrn+'"]')[0];
                                crnBlock.setAttribute('data-crnSpan',section.crn);
                                crnBlock.innerHTML=section.crn;
                                CORE.schedule.generate();

                            });
                            block.addEventListener('mouseover',CORE.schedule.blockOver);
                            block.addEventListener('mouseout',CORE.schedule.blockOut);
                            block.setAttribute('data-crn',section.crn);
                            block.setAttribute('data-possibleId',uniq);
                            block.setAttribute('data-sectionId',sectionUniq);
                            block.classList.add('tempBlock');
                            builderWrap.appendChild(block);
                        });
                    });
                }
            });
            CORE.schedule.blockBlur(e.target);
        },
        makeBlock:function(section,time,day){
            //Make a timeblock element
            
            var timeBlock   =   CORE.helper.element.createDiv({class:'b-timeBlock','data-crn':section.crn});
            if(day==-1){
                //special for online courses ;)
                CORE.helper.element.changeStyle(timeBlock,{
                    top     :   [0,'px'].join(''),
                    left    :   [0,'px'].join(''),
                    height  :   [(time.endTime-time.startTime)*(560/840),'px'].join(''),
                    lineHeight  :   [(time.endTime-time.startTime-4)*(560/840),'px'].join(''),
                    color   :   CORE.helper.color.getTextColor(CORE.helper.color.getBackgroundColor(section.courseName)),
                    backgroundColor :   CORE.helper.color.getBackgroundColor(section.courseName),
                    position    :   'relative'
                });
                timeBlock.innerHTML=section.courseName

                return timeBlock;
            }
            var top =   ((time.startTime-480)*(560/840));
            var left=   (((day+1)%7)*86);
            //Adjust its styles.
            CORE.helper.element.changeStyle(timeBlock,{
                top     :   [top,'px'].join(''),
                left    :   [left,'px'].join(''),
                height  :   [(time.endTime-time.startTime)*(560/840),'px'].join(''),
                lineHeight  :   [(time.endTime-time.startTime-4)*(560/840),'px'].join(''),
                color   :   CORE.helper.color.getTextColor(CORE.helper.color.getBackgroundColor(section.courseName)),
                backgroundColor :   CORE.helper.color.getBackgroundColor(section.courseName)
            });
            timeBlock.setAttribute('data-top',(time.startTime-480)*(560/840));
            timeBlock.setAttribute('data-left',((day+1)%7)*86);
            conflicts   =   document.querySelectorAll('[data-top="'+top+'"][data-left="'+left+'"]');
            [].forEach.call(conflicts,function(v,i,a){
                v.style.width=(85/(conflicts.length+1))+'px';
                v.style.left=(left+((85)/(conflicts.length+1))*(i+1))+'px';
                timeBlock.style.width=(85/(conflicts.length+1))+'px';
            });
            timeBlock.innerHTML=section.courseName
            
            //return the timeblock
            return timeBlock;
        },
        generate:function(){
            var builderWrap =   document.getElementsByClassName('b-timeBlockWrap')[0];
            CORE.currentCRNs.forEach(function(crn,index,array){
                CORE.crnMap[crn].times.forEach(function(time,index,array){
                    time.day.forEach(function(day,index,array){
                        var timeBlock = CORE.schedule.makeBlock(CORE.crnMap[crn],time,day);
                        timeBlock.addEventListener('click',CORE.schedule.blockClick);
                        builderWrap.appendChild(timeBlock);
                    });
                });
            });
        }
    };
})(CORE);


/*
CORE.view.crnInput  =   (function(CORE){
    document.getElementById('b-crnAddButton').addEventListener('click',function(e){
        //When that Add+ button is clicked toggle the crnInput
        if(e.target.getAttribute('data-active')=='true'){
            Velocity(document.getElementById('b-crnInput'),'fadeOut',300)
            e.target.setAttribute('data-active','false');
        }else{
            Velocity(document.getElementById('b-crnInput'),'fadeIn',{complete:function(){
                        document.getElementById('b-crnInput'),focus();
            }},300)

            e.target.setAttribute('data-active','true');
        }
    });
    
    document.getElementById('b-crnInput').addEventListener('keydown',function(e){
        //execute if the enter key is pressed on the crn input thing
        if (!e) { var e = window.event; }
        if (e.keyCode == 13) { 
            //Make an array of all the crns
            var crnArray    =   e.target.value.match(/(\d\d\d\d\d)/g);
            document.location.hash.substr(1).split('.').forEach(function(crn,index,array){
                //remove any crns already in hash
                if(crnArray.indexOf(crn)!==-1)
                crnArray.splice(crnArray.indexOf(crn),1);
            });
            
            //UnToggle the crnInput
            Velocity(document.getElementById('b-crnInput'),'fadeOut',300)
            document.getElementById('b-crnAddButton').setAttribute('data-active','false');
            //Refresh the page with new crns appended to hash if there are any crns left
            if(crnArray.length>0){
                document.location.hash=document.location.hash+'.'+crnArray.join('.');
                location.reload();
            }
        }
    });
    
})(CORE);

*/

CORE.view.crnBar    =   (function(CORE){
    return {
        init:function(){
            var crnBar  =   document.getElementById('crnBar');
            CORE.currentCRNs.forEach(function(v,i,a){
                var li  =   document.createElement('li');
                var span    =   document.createElement('span');
                span.innerHTML    =   v;
                span.setAttribute('data-crnSpan',v);
                li.className    =   'crnLabel';
                CORE.helper.element.changeStyle(span,{
                    color:'#FFF',
                    backgroundColor:CORE.helper.color.getBackgroundColor(CORE.crnMap[v].courseName),
                    padding:'10px',
                    fontSize:'12px'
                });
                li.appendChild(span);
                li.style.zIndex = 999999999;


                li.innerHTML+='<span style="user-select:none;-webkit-user-select: none;margin-left:20px;">'+CORE.crnMap[v].courseName+(CORE.crnMap[v].lab?' -Lab':'')+'</span>';
                crnBar.appendChild(li);
                li.setAttribute('data-clipboard-text',v);
                
            });
        }
    };
})(CORE);

var josephisAwesome=true;

//Some real change



(function main(){

    function rawExists(){
        CORE.main.parse.start();
        
        var newURL  =   [];
        var urlCRNs =   document.location.hash.substr(1).split('.');
        //Loop through all the crns in the url hash
        
        for(var i = urlCRNs.length;i--;)
            if(CORE.crnMap[urlCRNs[i]]!==undefined)
                newURL.unshift(urlCRNs[i]);
        
        document.location.hash  =   newURL.join('.');
        CORE.currentCRNs    =   newURL;
        CORE.schedule.generate();
        CORE.view.crnBar.init();
    }
    //Fix the Url
    document.location.hash='#'+document.location.hash.match(/(\d\d\d\d\d)/g).join('.');
    //kill the front.
    if(document.location.hash.match(/(\d\d\d\d\d)/g)!==null){
        document.getElementsByClassName('b-timeBlockWrap')[0].innerHTML='';
    }
    //Check Course Schedule Integrity
    if(document.location.hash.substr(1)==localStorage["currentSchedule"]){
        console.log('Raw Data is Good');
        rawExists();
    }else{
        //Get the data from the server
        console.log('Raw Data is Corrupt');
        CORE.main.fetch(document.location.hash.substr(1).split('.'),function(){
            rawExists();
        });
    }
})();
