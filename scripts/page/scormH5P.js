/**
 * @file
 * SCORM h5p.
 */

/**
 * Check of test compilation..
 */
function finishedH5Ptest() {
  var hasParent = !!this.parent,
      currentMachineName = this.libraryInfo ? this.libraryInfo.machineName : '',
      instance = hasParent && this.parent.instance ? this.parent.instance : this.parent,
      machineName = hasParent ? instance.libraryInfo.machineName : currentMachineName;

  return !(
      (currentMachineName === 'H5P.FreeTextQuestion') ||
      (machineName === 'H5P.SingleChoiceSet' && typeof this.result.response !== 'undefined') ||
      (hasParent && machineName === 'H5P.QuestionSet' && !this.totalScore) ||
      (hasParent && machineName === 'H5P.QuestionSetLTC' && !this.totalScore) ||
      (currentMachineName === 'H5P.Summary' && !this.result.completion) ||
      (hasParent && (currentMachineName === 'H5P.SpeakTheWords' || currentMachineName === 'H5P.SimpleMultiChoice' || currentMachineName === 'H5P.OpenEndedQuestion')) ||
      (machineName === 'H5P.ImageMultipleHotspotQuestion' && this.maxScore !== this.score)
  );
}

/**
 * Tracking results of h5p test.
 */
function scormH5PtrackingFunctionality() {
  if (window.H5P.EventDispatcher) {
    window.H5P.externalDispatcher.on('xAPI', function(event) {
      if (typeof H5Ptests[this.contentId] == 'undefined' || !event.data.statement.result || (typeof event.data.statement.result.completion !== 'undefined' && !event.data.statement.result.completion)) {
        return;
      }

      this.result = event.data.statement.result;

      if (finishedH5Ptest.call(this)) {
        var objectiveId = H5Ptests[this.contentId] + ' (' + this.contentId + ')',
            parent = window.parent,
            scormSet = parent.scormProcessSetValue,
            scormGet = parent.scormProcessGetValue,
            objectiveIndex = parent.scormFindObjectiveIndexFromID(objectiveId),
            currentScore = scormGet('cmi.core.score.raw'),
            scaled = this.result.score.scaled,
            testScore = scormGet('cmi.objectives.' + objectiveIndex + '.score.raw'),
            result, status;

        status = this.result.completion && scaled ? parent.SCORM_PASSED : parent.SCORM_FAILED;

        if (this.result.success === true && scaled) {
          status = parent.SCORM_PASSED;
        }
        else if (this.result.success === false) {
          status = parent.SCORM_FAILED;
        }

        scaled = Math.round(scaled * 100);
        testScore = testScore ? parseInt(testScore, 10) : 0;

        if (!testScore || testScore < scaled) {
          scormSet('cmi.objectives.' + objectiveIndex + '.id', objectiveId);
          scormSet('cmi.objectives.' + objectiveIndex + '.status', status);
          scormSet('cmi.objectives.' + objectiveIndex + '.score.min', 0);
          scormSet('cmi.objectives.' + objectiveIndex + '.score.max', 100);
          scormSet('cmi.objectives.' + objectiveIndex + '.score.raw', scaled);
        }

        result = parent.scormStautsByObjectives(Object.keys(H5Ptests).length);
        currentScore = currentScore ? parseInt(currentScore, 10) : 0;

        if (result.status && result.score > currentScore) {
          scormSet('cmi.core.score.raw', result.score);
          scormSet('cmi.core.score.min', 0);
          scormSet('cmi.core.score.max', 100);
          scormSet('cmi.core.lesson_status', result.status);
        }
      }
    });
  }
}
