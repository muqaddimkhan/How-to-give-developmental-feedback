/**
 * @file
 * Page.
 */

(function($) {
  'use strict';

  $(document).ready(function() {
    var resizeObserver = new ResizeObserver(() => {
      resizeExternalVideos();
      resizePage();
    });

    resizeObserver.observe($('body').get(0));

    resizePage();
    resizeExternalVideos();

    $('a[data-nid]').each(function() {
      var $element = $(this),
          nid = $element.attr('data-nid');

      if (nid) {
        $element.on('click', function(e) {
          e.preventDefault();

          var data = {
            type: 'open-page',
            nid: nid
          };

          // Send message to change current page.
          window.parent.postMessage(JSON.stringify(data), '*');
        });
      }
    });

    /**
     * Code snippet widget.
     */
    if (typeof CodeMirror !== 'undefined') {
      $('textarea.code-snippet').each(function() {
        var $this = $(this),
            mode = CodeMirror.findModeByName($this.attr('data-mode') || 'JavaScript'),
            editor = CodeMirror.fromTextArea($this[0], {
              autofocus: false,
              inputStyle: 'contenteditable',
              readOnly: 'nocursor',
              value: $this.text() || '',
              mode: mode.mode,
              lineNumbers: true,
              lineWrapping: false,
              dragDrop: false,
              autoCloseTags: true,
              matchTags: true,
              autoCloseBrackets: true,
              matchBrackets: true,
              indentUnit: 2,
              indentWithTabs: false,
              tabSize: 2
            });

        CodeMirror.modeURL = "../libraries/codemirror/mode/%N/%N.js";
        CodeMirror.autoLoadMode(editor, mode.mode);

        resizePage();
      });
    }

    /**
     * Mathjax widget.
     */
    if (typeof MathJax !== 'undefined') {
      MathJax.Hub.Register.StartupHook('End', function () {
        resizePage();
      });
    }
  });

  /**
   * Resize external videos.
   */
  function resizeExternalVideos() {
    $('iframe.external-video').each(function() {
      var $this = $(this),
          width = 560,
          height = width / 1.7777,
          elementWidth = $this.width(),
          elementHeight = elementWidth * height / width;

      $this.height(elementHeight);
    });
  }

  /**
   * Resize entire page.
   */
  function resizePage() {
    var data = {
      type: 'resize',
      height: $('body').outerHeight(true) + 20
    };

    // Send message to change the frame size.
    window.parent.postMessage(JSON.stringify(data), '*');
  }

})(jQuery);
