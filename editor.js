$(function(){
    hljs.initHighlightingOnLoad();
    var rendererMD = new marked.Renderer();
    rendererMD.heading = function (text, level) {
        var escapedText = text;
        return '<h' + level + '><a name="' +
                escapedText +
                 '" class="anchor" href="#' +
                 escapedText +
                 '"><span class="fa fa-link"></span></a>' +
                  text + '</h' + level + '>';
    };

    marked.setOptions({
      renderer: rendererMD,
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      highlight: function (code) {
        return hljs.highlightAuto(code).value;
      }
    });
    var buildToc = function(headings){
        var html = "<div id='toc-container' class='toc-container'><dl id='markdown-toc'>\n";
        var h = [0,0,0,0,0,0,0],
            indent = '&nbsp;&nbsp;';
        var head,text,title;
        var last_depth = headings[0].depth;
        for (var i = 0;i<headings.length;i++){
            head = headings[i];
            if (head.depth<=last_depth){
                for (var j = head.depth + 1; j<7;j++)h[j] = 0;
                h[head.depth]++;
                last_depth = head.depth;
            }
            else{
                h[head.depth]++;
            }
            text = head.text;
            html += '<dt>';
            title = '';
            for (var j = 1;j<=head.depth;j++){
                html += indent;
                if (h[j]!=0)title += h[j]+'.';
            }
            html += '<a href="#' + text+'">';
            title = title.slice(0, title.length-1) + ' ';
            html += title + text + '</a></dt>';
        }
        html += '</dl></div>';
        return html;
    }
    var markdown = function(str){
        var tokens = marked.lexer(str);
        var headings = [];
        var tocIndex = -1;
        for (var i=0;i<tokens.length;i++){
            if (tokens[i].type=='paragraph' && tokens[i].text=='[TOC]'){
                tocIndex = i;
            }
            if (tokens[i].type=='heading'){
                headings.push(tokens[i]);
            }
        }
        if (tocIndex!=-1 && headings.length > 0){
            var html = buildToc(headings);
            //tokens[tocIndex] = {type:'html',text:html};
            tokens.splice(tocIndex,1);
            tokens.unshift({type:'html',text:html});
        }
        return marked.parser(tokens);
    };
    var editor = ace.edit("editor");
    editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    });
    editor.setTheme("ace/theme/chrome");
    editor.session.setMode('ace/mode/markdown');
    editor.setShowInvisibles(true);
    editor.setFontSize(18);
    editor.setOption("wrap", "free");
    editor.setReadOnly(false);
    editor.setOption('foldStyle', "manual");
    editor.getSession().setUseWrapMode(true)
    editor.getSession().on('change',function(){
        $('#preview').html(markdown(editor.getValue()));
    });
    $('#preview').parent().scroll(function(){
        var toc = $('#markdown-toc');
        if (toc.length==0) return;
        var h = $('#preview').parent().scrollTop()+20;
        toc.parent().attr('style',`top:${h}px;`);
    });
    var pasteImage=function(blob){
        window.URL = window.URL || window.webkitURL;
        var blobUrl = window.URL.createObjectURL(blob);
        editor.insert('![img]('+blobUrl+')');
        // var form = new FormData();
        // form.append('image',blob);
        // $.ajax({
        //     url: '/upload/paste/',
        //     type: 'post',
        //     data: form,
        //     cache: false,
        //     contentType: false,
        //     processData: false,
        //     success:function( msg ){
        //         if ( msg.code == 200 ){
        //             var url = msg.url;
        //             editor.insert('![img]('+url+')');
        //         }
        //     }
        // });
    }
    var uploadfile = function(blob){
        console.dir(blob);
        window.URL = window.URL || window.webkitURL;
        var blobUrl = window.URL.createObjectURL(blob);
        if (/image/.test(blob.type)){
            editor.insert('!['+ blob.name +']('+blobUrl+')');
        }else{
            editor.insert('['+ blob.name +']('+blobUrl+')');
        }
        // var form = new FormData();
        // form.append('file',blob);
        // $.ajax({
        //     url: '/upload/dragdrop/',
        //     type: 'post',
        //     data: form,
        //     cache: false,
        //     contentType: false,
        //     processData: false,
        //     success:function( msg ){
        //         if ( msg.code == 200 ){
        //             var url = msg.url;
        //             editor.insert('['+ blob.name +']('+url+')');
        //         }
        //     }
        // });
    }
    $('#editor').get(0).addEventListener('paste',function(e){
        var ev = ev || window.event, clipboardData = ev.clipboardData,
            i = 0, items, item, files;
        if (clipboardData) {
            items = clipboardData.items;
            files = clipboardData.files;
            if (files && files.length) {
                pasteImage(files[0]);
                return;
            }
            if (!items) { return; }
            for (; i < items.length; i++) {
                if (items[i].kind === 'file' && items[i].type.match(/^image\//i)) {
                    item = items[i];
                    break;
                }
            }
            if (item) {
                pasteImage(item);
            }
        }
        return false;
    });
    $('#editor').on('dragenter', function(e){e.preventDefault()});
    $('#editor').on('dragover', function(e){e.preventDefault()});
    $('#editor').on('drop', function(e){
        e.stopPropagation();
        e.preventDefault();
        var files = e.originalEvent.dataTransfer.files;
        if (files && files.length) {
            for(var i=0;i<files.length;i++){
                uploadfile(files[i]);
            }
        }
    });
    var toolbar={
        insert:function(signal, placehold){
            return function(){
                var sel = editor.getSelection();
                var r = editor.getSelectionRange();
                if (sel.isEmpty()){
                    editor.insert(signal+placehold+signal);
                    sel.moveCursorBy(0,-signal.length);
                    for (var i=0;i<placehold.length;i++){
                        sel.selectLeft();
                    }
                }else{
                    sel.clearSelection();
                    sel.moveCursorToPosition(r.end);
                    editor.insert(signal);
                    sel.moveCursorToPosition(r.start);
                    editor.insert(signal);
                    var new_r = {
                        start:{
                            row: r.start.row,
                            column: r.start.column+signal.length
                        },
                        end:{
                            row: r.end.row,
                            column: r.end.column+signal.length
                        }
                    };
                    new_r.__proto__ = r.__proto__;
                    sel.addRange(new_r);
                }
                editor.focus();
            }
        },
        register:function(){
            $('.toolbutton > .fa-bold').click(this.insert("**", "粗体"));
            $('.toolbutton > .fa-italic').click(this.insert("_", "斜体"));
            $('.toolbutton > .fa-strikethrough').click(this.insert("~~", "删除"));
            $('.toolbutton > .fa-quote-left').click(function(event){
                var sel = editor.getSelection();
                var r = editor.getSelectionRange();
                sel.clearSelection();
                for (var i = r.start.row;i<=r.end.row;i++){
                    editor.moveCursorToPosition({row:i,column:0})
                    editor.insert('>');
                }
                sel.clearSelection();
                editor.navigateLineEnd()
                editor.focus();
            });
            $('.toolbutton> .fa-header').click(function(event){
                var sel = editor.getSelection();
                var r = editor.getSelectionRange();
                if (!sel.isEmpty()){
                    sel.clearSelection();
                    for (var i = r.start.row;i<=r.end.row;i++){
                        editor.moveCursorToPosition({row:i,column:0})
                        editor.insert('### ');
                        editor.navigateLineEnd();
                        editor.insert(' ###');
                    }
                }else{
                    editor.insert("### 标题 ###");
                    sel.moveCursorBy(0,-4);
                    sel.selectLeft();
                    sel.selectLeft();
                }
                editor.focus();
            });
            $('.toolbutton> .fa-link').click(function(e){
                $('#EditorModal-link').modal();
            });
            $('.toolbutton> .fa-image').click(function(e){
                $('#EditorModal-image').modal();
            });
            $('.toolbutton> .fa-code').click(function(e){
                $('#EditorModal-code').modal();
            });
            $('.toolbutton> .fa-list-ul').click(this.list(false));
            $('.toolbutton> .fa-list-ol').click(this.list(true));
            $('.toolbutton> .fa-gears').click(function(e){
                $('#EditorModal-settings').modal();
            });
        },
        list:function(t){
            return function(e){
                var sel = editor.getSelection();
                var r = editor.getSelectionRange();
                sel.clearSelection();
                for (var i = r.start.row;i<=r.end.row;i++){
                    editor.moveCursorToPosition({row:i,column:0})
                    if(t){
                        editor.insert((i-r.start.row+1)+'. ');
                    }
                    else{
                        editor.insert("+ ");
                    }
                }
                editor.navigateLineEnd();
                if (sel.isEmpty){
                    editor.navigateRight();
                }
                editor.focus();
            }
        }
    }
    $('#EditorModal-link').find('.btn-primary').click(function(e){
        var link = $('#link').val();
        var link_submary = $('#link-submary').val();
        editor.insert(`[${link_submary}](${link})`);
        $('#EditorModal-link').find('.btn-default').click();
        $('#link').val('');
        $('#link-submary').val('');
        editor.focus();
    });
    $('#EditorModal-image').find('.btn-primary').click(function(e){
        var link = $('#image').val();
        var link_submary = $('#image-submary').val();
        editor.insert(`![${link_submary}](${link})`);
        $('#EditorModal-image').find('.btn-default').click();
        $('#image').val('');
        $('#image-submary').val('');
        editor.focus();
    });
    var code_editor = ace.edit('code-editor');
    code_editor.setTheme("ace/theme/chrome");
    code_editor.getSession().setMode('ace/mode/python');
    code_editor.setShowInvisibles(true);
    code_editor.setFontSize(18);
    code_editor.setOption("wrap", "on");
    code_editor.setReadOnly(false);
    code_editor.getSession().setUseWrapMode(true);
    $('#code-language').on('change',function(){
        var language = $(this).val();
        code_editor.getSession().setMode('ace/mode/'+language);
    });
    $('#EditorModal-code').find('.btn-primary').click(function(e){
        var code_language = $('#code-language').val();
        var code =code_editor.getValue();
        editor.insert('```'+code_language+'\n');
        editor.insert(code);
        editor.insert('\n```\n');
        $('#EditorModal-code').find('.btn-default').click();
        code_editor.setValue('');
        editor.focus();
    });
    var select = function(id,value){
        var opts = $('#'+id+' option');
        for (var i=0;i<opts.length;i++){
            if ($(opts[i]).attr('value')==value){
                $(opts[i]).attr('selected','selected');
                break;
            }
            else{
                $(opts[i]).attr('selected',false);
            }
        }
    };
    $('#EditorModal-settings').on('show.bs.modal', function(e){
        select('theme', editor.getTheme());
        select('fontsize', editor.getFontSize());
        select('folding', editor.getOption('foldStyle'));
        select('soft_wrap', editor.getOption('wrap'));
        $('#draw-whitespace').attr('checked', editor.getOption('showInvisibles'));
        $('#show-line-number').attr('checked', editor.getOption('showLineNumbers'));
        $('#highlight-activeline').attr('checked', editor.getOption('highlightActiveLine'));
    });
    $('#EditorModal-settings').find('.btn-primary').click(function(e){
        editor.setTheme($('#theme').val());
        editor.setFontSize($('#fontsize').val());
        editor.setOption('wrap', $('#soft_wrap').val());
        editor.setOption('foldStyle', $('folding').val());
        editor.setOption('showInvisibles',$('#draw-whitespace').get(0).checked);
        editor.setOption('showLineNumbers',$('#show-line-number').get(0).checked);
        editor.setOption('highlightActiveLine',$('#highlight-activeline').get(0).checked);
        $('#EditorModal-settings').find('.btn-default').click();
        editor.focus();
    });
    toolbar.register();
    editor.focus();
});