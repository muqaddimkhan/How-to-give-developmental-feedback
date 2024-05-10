/**
 * @file
 * SCORM common.
 */

var findAPITries = 0,
    SCORM_TRUE = 'true',
    SCORM_FALSE = 'false',
    SCORM_NO_ERROR = '0',
    SCORM_PASSED = 'passed',
    SCORM_FAILED = 'failed',
    SCORM_COMPLETED = 'completed'
    finishCalled = false,
    initialized = false,
    API = null,
    startTimeStamp = new Date();

function findAPI(win) {
  // Check to see if the window (win) contains the API
  // if the window (win) does not contain the API and
  // the window (win) has a parent window and the parent window
  // is not the same as the window (win)
  while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
    // increment the number of findAPITries
    findAPITries++;

    // Note: 7 is an arbitrary number, but should be more than sufficient
    if (findAPITries > 7) {
      alert('Error finding API -- too deeply nested.');

      return null;
    }

    // set the variable that represents the window being
    // being searched to be the parent of the current window
    // then search for the API again
    win = win.parent;
  }

  return win.API;
}

function getAPI() {
  // start by looking for the API in the current window
  var theAPI = findAPI(window);

  // if the API is null (could not be found in the current window)
  // and the current window has an opener window
  if ((theAPI == null) && (window.opener != null) && (typeof(window.opener) != 'undefined')) {
    // try to find the API in the current windows opener
    theAPI = findAPI(window.opener);
  }

  // if the API has not been found
  if (theAPI == null) {
    // Alert the user that the API Adapter could not be found
    alert('Unable to find an API adapter');
  }

  return theAPI;
}

function scormProcessInitialize() {
  var result;

  API = getAPI();

  if (API == null) {
    alert('Error - Could not establish a connection with the LMS.\n\nYour results may not be recorded.');

    return;
  }

  result = API.LMSInitialize('');

  if (result == SCORM_FALSE) {
    var errorNumber = API.LMSGetLastError(),
        errorString = API.LMSGetErrorString(errorNumber),
        diagnostic = API.LMSGetDiagnostic(errorNumber),
        errorDescription = 'Number: ' + errorNumber + '\nDescription: ' + errorString + '\nDiagnostic: ' + diagnostic;

    alert('Error - Could not initialize communication with the LMS.\n\nYour results may not be recorded.\n\n' + errorDescription);

    return;
  }

  initialized = true;
}

function scormProcessFinish() {
  var result;

  // Don't terminate if we haven't initialized or if we've already terminated.
  if (initialized == false || finishCalled == true) {
    return;
  }

  result = API.LMSFinish('');

  finishCalled = true;

  if (result == SCORM_FALSE) {
    var errorNumber = API.LMSGetLastError(),
        errorString = API.LMSGetErrorString(errorNumber),
        diagnostic = API.LMSGetDiagnostic(errorNumber),
        errorDescription = 'Number: ' + errorNumber + '\nDescription: ' + errorString + '\nDiagnostic: ' + diagnostic;

    alert('Error - Could not terminate communication with the LMS.\n\nYour results may not be recorded.\n\n' + errorDescription);

    return;
  }
}

function scormProcessGetValue(element) {
  var result;

  if (initialized == false || finishCalled == true) {
    return;
  }

  result = API.LMSGetValue(element);

  if (result == '') {
    var errorNumber = API.LMSGetLastError();

    if (errorNumber != SCORM_NO_ERROR) {
      var errorString = API.LMSGetErrorString(errorNumber),
          diagnostic = API.LMSGetDiagnostic(errorNumber),
          errorDescription = 'Number: ' + errorNumber + '\nDescription: ' + errorString + '\nDiagnostic: ' + diagnostic;

      alert('Error - Could not retrieve a value from the LMS.\n\n' + errorDescription);

      return '';
    }
  }

  return result;
}

function scormProcessSetValue(element, value) {
  var result;

  if (initialized == false || finishCalled == true) {
    return;
  }

  result = API.LMSSetValue(element, value);

  if (result == SCORM_FALSE) {
    var errorNumber = API.LMSGetLastError(),
        errorString = API.LMSGetErrorString(errorNumber),
        diagnostic = API.LMSGetDiagnostic(errorNumber),
        errorDescription = 'Number: ' + errorNumber + '\nDescription: ' + errorString + '\nDiagnostic: ' + diagnostic;

    alert('Error - Could not store a value in the LMS.\n\nYour results may not be recorded.\n\n' + errorDescription);

    return;
  }
}

function convertMilliSecondsToSCORMTime(intTotalMilliseconds, blnIncludeFraction) {
  var intHours,
      intSeconds,
      intMinutes,
      intMilliseconds,
      intHundredths,
      strCMITimeSpan;

  if (blnIncludeFraction == null || blnIncludeFraction == undefined) {
    blnIncludeFraction = true;
  }

  intMilliseconds = intTotalMilliseconds % 1000;
  intSeconds = ((intTotalMilliseconds - intMilliseconds) / 1000) % 60;
  intMinutes = ((intTotalMilliseconds - intMilliseconds - (intSeconds * 1000)) / 60000) % 60;
  intHours = (intTotalMilliseconds - intMilliseconds - (intSeconds * 1000) - (intMinutes * 60000)) / 3600000;

  if (intHours == 10000) {
    intHours = 9999;
    intMinutes = (intTotalMilliseconds - (intHours * 3600000)) / 60000;

    if (intMinutes == 100) {
      intMinutes = 99;
    }

    intMinutes = Math.floor(intMinutes);
    intSeconds = (intTotalMilliseconds - (intHours * 3600000) - (intMinutes * 60000)) / 1000;

    if (intSeconds == 100) {
      intSeconds = 99;
    }

    intSeconds = Math.floor(intSeconds);
    intMilliseconds = (intTotalMilliseconds - (intHours * 3600000) - (intMinutes * 60000) - (intSeconds * 1000));
  }

  intHundredths = Math.floor(intMilliseconds / 10);
  strCMITimeSpan = zeroPad(intHours, 4) + ':' + zeroPad(intMinutes, 2) + ':' + zeroPad(intSeconds, 2);

  if (blnIncludeFraction) {
    strCMITimeSpan += '.' + intHundredths;
  }

  if (intHours > 9999) {
    strCMITimeSpan = '9999:99:99';

    if (blnIncludeFraction) {
      strCMITimeSpan += '.99';
    }
  }

  return strCMITimeSpan;
}

function zeroPad(intNum, intNumDigits) {
  var strTemp = new String(intNum),
      intLen = strTemp.length,
      i;

  if (intLen > intNumDigits) {
    strTemp = strTemp.substr(0, intNumDigits);
  }
  else {
    for (i = intLen; i < intNumDigits; i++) {
      strTemp = '0' + strTemp;
    }
  }

  return strTemp;
}

function scormFindObjectiveIndexFromID(strObjectiveID) {
  var intCount, i, strTempID;

  intCount = scormProcessGetValue('cmi.objectives._count');

  if (intCount == '') {
    return 0;
  }

  intCount = parseInt(intCount, 10);

  for (i = 0; i < intCount; i++) {
    strTempID = scormProcessGetValue('cmi.objectives.' + i + '.id');

    if (strTempID == strObjectiveID) {
      return i;
    }
  }

  return intCount;
}

function scormStautsByObjectives(totalCount) {
  var objectiveCount, i, result = {}, status, score = 0;

  objectiveCount = scormProcessGetValue('cmi.objectives._count');

  if (objectiveCount == '' || !totalCount || totalCount > objectiveCount) {
    return result;
  }

  objectiveCount = parseInt(objectiveCount, 10);

  for (i = 0; i < objectiveCount; i++) {
    status = scormProcessGetValue('cmi.objectives.' + i + '.status');
    score += parseInt(scormProcessGetValue('cmi.objectives.' + i + '.score.raw'), 10);

    if (status == SCORM_FAILED) {
      result.status = SCORM_FAILED;
    }
  }

  result.score = Math.round(score / totalCount);

  if (!result.status) {
    result.status = SCORM_PASSED;
  }

  return result;
}
