/**
 * @file
 * Application.
 */

(function($, UIkit) {
  'use strict';

  window.Application = function(course) {
    this.currentPage = 0;
    this.pages = [];
    this.course = course;
    this.$menuWrapper = $('#sidebar');
    this.currentPage = null;
    this.processedUnload = false;
    this.reachedEnd = false;

    // Initialize communication with the LMS.
    scormProcessInitialize();
  };

  Application.prototype = {
    /**
     * Create navigation menu and attach events.
     */
    navigationCreate: function() {
      var menuHtml = this._navigationBuildHtml(this.course.structure.pages);

      this.$menuWrapper.append(menuHtml);
      this._navigationAttachEvents();

      $.each(this.pages, function(id, data) {
        $('a[data-nid="' + data.nid + '"]', self.$menuWrapper).attr('data-index', id);
      });
    },

    _navigationBuildHtml: function(pages) {
      var self = this,
          items = '<ul class="uk-nav uk-nav-side">';

      $.each(pages, function(key, item) {
        items += '<li>';
        items += '<a href="#" data-nid="' + item.nid + '">' + item.title + '</a>';
        self.pages.push({
          nid: item.nid,
          title: item.title,
          url: item.url
        });

        if (typeof item.pages !== typeof undefined) {
          items += self._navigationBuildHtml(item.pages);
        }

        items += '</li>';
      });

      items += '</ul>';

      return items;
    },

    _navigationAttachEvents: function() {
      var self = this;

      $('a', this.$menuWrapper).each(function() {
        var $element = $(this),
            nid = $element.attr('data-nid');

        if (typeof nid !== typeof undefined && nid !== false) {
          $element.on('click', function(e) {
            e.preventDefault();
            self.currentPage = self._getPageIdByNid(nid);

            self.openPage(self.currentPage, true);
          });
        }
      });

      $('a.menu').on('click', function(e) {
        e.preventDefault();

        $('body').toggleClass('page-sidebar-opened');
      });

      $('a.prev').on('click', function(e) {
        e.preventDefault();

        if (!self.currentPage) {
          self.currentPage = self.pages.length - 1;
        }
        else {
          self.currentPage--;
        }

        self.openPage(self.currentPage, true);
      });

      $('a.next').on('click', function(e) {
        e.preventDefault();

        if (parseInt(self.currentPage, 10) === self.pages.length - 1) {
          self.currentPage = 0;
        }
        else {
          self.currentPage++;
        }

        self.openPage(self.currentPage, true);
      });

      $('a.close').on('click', function(e) {
        e.preventDefault();
        self.doExit();
      });
    },

    _navigationSetActive: function(nid) {
      var $link = $('a[data-nid="' + nid + '"]', this.$menuWrapper);

      $('li.uk-active', this.$menuWrapper).removeClass('uk-active');
      $link.closest('li').addClass('uk-active');

      if (!$link.hasClass('visited')) {
        $link.addClass('visited');
        $link.append(' <i class="uk-icon-check"></i>');
      }
    },

    openPage: function(pageId, save) {
      var $frame = $('#content-frame'),
          page = this.pages[pageId],
          argStr;

      if (save) {
        // Save the current location as the bookmark.
        scormProcessSetValue('cmi.core.lesson_location', pageId.toString());

        // The course is considered complete when the last page is reached.
        if (pageId == (this.pages.length - 1)) {
          this.reachedEnd = true;
          scormProcessSetValue('cmi.core.lesson_status', 'completed');
        }
      }

      if (parseInt($frame.attr('data-nid'), 10) === parseInt(page.nid, 10)) {
        return;
      }

      // Pass arguments to the frame.
      argStr = (page.url.indexOf('?') !== -1) ? '&' + location.search.slice(1) : location.search;

      // Set active navigation item.
      this._navigationSetActive(page.nid);

      // Navigate the iFrame to the content.
      $frame.attr('src', page.url + argStr);
      $frame.attr('data-nid', page.nid);

      // Change title of the window.
      $('title').text(page.title + ' | ' + this.course.info.title);
    },

    start: function() {
      var self = this;

      this.navigationCreate();
      this.openPage(0);

      var completionStatus = scormProcessGetValue('cmi.core.lesson_status'),
          bookmark = scormProcessGetValue('cmi.core.lesson_location');

      if (completionStatus == 'not attempted') {
        scormProcessSetValue('cmi.core.lesson_status', 'incomplete');
      }

      // If there isn't a stored bookmark, start the user at the first page.
      if (bookmark == '') {
        self.currentPage = 0;
        self.openPage(self.currentPage, true);
        self._markVisitedPage();
      }
      else {
        //  If there is a stored bookmark, prompt the user to resume from the previous location.
        UIkit.modal.confirm('Would you like to resume from where you previously left off?', function() {
          self.currentPage = parseInt(bookmark, 10);
          self.openPage(self.currentPage, true);
          self._markVisitedPage();
        }, function() {
          self.currentPage = 0;
          self.openPage(self.currentPage, true);
          self._markVisitedPage();
        }, {
          center: true
        });
      }
    },

    _markVisitedPage: function() {
      var self = this,
          $link;

      $.each(self.pages, function(id, data) {
        if (self.currentPage >= id) {
          $link = $('a[data-nid="' + data.nid + '"]:not(.visited)', self.$menuWrapper);
          $link.addClass('visited');
          $link.append(' <i class="uk-icon-check"></i>');
        }
      });
    },

    _getPageIdByNid: function(nid) {
      var self = this,
          pageId = '';

      $.each(self.pages, function(key, item) {
        if (parseInt(item.nid, 10) === parseInt(nid, 10)) {
          pageId = key;
        }
      });

      return pageId;
    },

    doExit: function() {
      var self = this;

      UIkit.modal.confirm('Are you sure you want to exit?', function() {
        if (self.reachedEnd == false) {
          // Set exit to suspend.
          scormProcessSetValue('cmi.core.exit', 'suspend');
        }
        else {
          // Set exit to normal.
          scormProcessSetValue('cmi.core.exit', '');
        }

        self.doUnload(true);
      }, {
        center: true
      });
    },

    doUnload: function(pressedExit) {
      // Don't call this function twice.
      if (this.processedUnload == true) {
        return;
      }

      this.processedUnload = true;

      var endTimeStamp = new Date(),
          totalMilliseconds = (endTimeStamp.getTime() - startTimeStamp.getTime()),
          scormTime = convertMilliSecondsToSCORMTime(totalMilliseconds, false),
          lesson_location = this.currentPage || $('li.uk-active a', $('#sidebar')).data('index');

      scormProcessSetValue('cmi.core.session_time', scormTime);
      scormProcessSetValue('cmi.core.lesson_location', lesson_location.toString());

      //if the user just closes the browser, we will default to saving
      //their progress data. If the user presses exit, he is prompted.
      //If the user reached the end, the exit normall to submit results.
      if (pressedExit == false && this.reachedEnd == false){
        scormProcessSetValue('cmi.core.exit', 'suspend');
      }

      scormProcessFinish();

      $('.scorm-1-2').addClass('finished').html('<span>Course exited and progress saved. You may now close this window.</span>');
    }
  };

  $(document).ready(function() {
    if (!initData) {
      UIkit.notify({
        message: 'Initial data is missed.',
        status: 'danger',
        timeout: false
      });

      return;
    }

    initData = JSON.parse(initData);

    var application = new Application(initData.course);

    application.start();

    if (window.addEventListener) {
      window.addEventListener('message', messageListener);
    } else {
      // IE8.
      window.attachEvent('onmessage', messageListener);
    }

    // Message listener.
    function messageListener(event) {
      var data = event.data ? JSON.parse(event.data) : {},
          type = data.type || false;

      // Change size of frame.
      if (type === 'resize') {
        $('#content-frame').css('height', data.height + 'px');
      }

      // Change current page.
      if (type === 'open-page') {
        var pageId = application._getPageIdByNid(data.nid);

        if (pageId) {
          application.openPage(pageId, true);
        }
      }
    }
  });

})(jQuery, UIkit);
