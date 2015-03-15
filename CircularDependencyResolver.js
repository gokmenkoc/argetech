(function (){
	var equalObj = {};

	//Returns the object's class, Array, Date, RegExp, Object are of interest to us
	function getClass(val) {
		return Object.prototype.toString.call(val)
			.match(/^\[object\s(.*)\]$/)[1];
	}

	//Defines the type of the value, extended typeof
	function whatis(val) {

		if (val === undefined) {
			return 'undefined';
		}
		if (val === null) {
			return 'null';
		}

		var type = typeof val;

		if (type === 'object') {
			type = getClass(val).toLowerCase();
		}

		if (type === 'number') {
			if (val.toString().indexOf('.') > 0) {
				return 'float';
			}
			return 'integer';
		}
		return type;
	}

	/*
	 * Are two values equal, deep compare for objects and arrays.
	 * @param a {any}
	 * @param b {any}
	 * @return {boolean} Are equal?
	 */
	function equal(a, b) {
		if (a !== b) {
			var atype = whatis(a),
				btype = whatis(b);
			if (atype === btype) {
				return equalObj.hasOwnProperty(atype) ? equalObj[atype](a, b) : a == b;
			}
			return false;
		}
		return true;
	}

	function compareObjects(a, b) {
		var i;
		if (a === b) {
			return true;
		}
		for (i in a) {
			if (a.hasOwnProperty(i)) {
				if (b.hasOwnProperty(i)) {
					if (!equal(a[i], b[i])) {
						return false;
					}
				} else {
					return false;
				}
			}
		}

		for (i in b) {
			if (b.hasOwnProperty(i) && !a.hasOwnProperty(i)) {
				return false;
			}
		}
		return true;
	}

	function compareArrays(a, b) {
		var i;
		if (a === b) {
			return true;
		}
		if (a.length !== b.length) {
			return false;
		}
		for (i = 0; i < a.length; i = i + 1) {
			if (!equal(a[i], b[i])) {
				return false;
			}
		}
		return true;
	}

	equalObj.array = compareArrays;
	equalObj.object = compareObjects;
	equalObj.date = function (a, b) {
		return a.getTime() === b.getTime();
	};
	equalObj.regexp = function (a, b) {
		return a.toString() === b.toString();
	};

	function searchInStack(value, stack) {
		var index;
		for (index in stack) {
			if (stack.hasOwnProperty(index)) {
				if (equal(stack[index].value, value)) {
					return index;
				}
			}
		}
		return -1;
	}

	function getFingerPrint(parentIndex, stack) {
		var pIndex = parentIndex,
			fingerPrint = "";
		while (pIndex !== null) {
			fingerPrint += stack[pIndex].name + "." + fingerPrint;
			pIndex = stack[pIndex].parentIndex;
		}
		return fingerPrint.substring(0, fingerPrint.length - 1);
	}

	function resolveJson(jsonData) {
		var stack = {
			"0": {
					"name": "jsonData",
					"value": jsonData,
					"parentIndex": null
				}
			},
			index = 1,
			key,
			value,
			valueIndex,
			indexes = [1],
			previousIndex,
			stackKey,
			stackValue,
			innerStackKey,
			innerStackValue,
			innerValueIndex;

		// parent seviyeyi oluştur
		for (key in jsonData) {
			if (jsonData.hasOwnProperty(key)) {
				value = jsonData[key];
				if (typeof value !== "function") {
					// mevcutta var mı arama yap
					if (typeof value === "object") {
						valueIndex = searchInStack(value, stack);
					} else {
						valueIndex = -1;
					}

					if (valueIndex === -1) {
						stack[index] = {
							"name": key,
							"value": value,
							"type": typeof value,
							"parentIndex": 0
						};
					} else {
						if (typeof value === "object") {
							jsonData[key] = "[cdep:(" + getFingerPrint(valueIndex, stack) + ")]";
						}
					}
				}
				index = index + 1;
			}
		}

		// alt seviyelere dallan
		while (true) {
			indexes.push(index);
			previousIndex = indexes[indexes.length - 2];
			for (stackKey in stack) {
				if (stack.hasOwnProperty(stackKey)) {
					if (stackKey > previousIndex) {
						stackValue = stack[stackKey].value;
						if (stack[stackKey].type === "object") {
							for (innerStackKey in stackValue) {
								if (stackValue.hasOwnProperty(innerStackKey)) {
									innerStackValue = stackValue[innerStackKey];
									if (typeof innerStackValue !== "function") {
										if (typeof value === "object") {
											innerValueIndex = searchInStack(innerStackValue, stack);
										} else {
											innerValueIndex = -1;
										}
										if (innerValueIndex === -1) {
											stack[index] = {
												"name": innerStackKey,
												"value": innerStackValue,
												"type": typeof innerStackValue,
												"parentIndex": stackKey
											};
										} else {
											if (typeof innerStackValue === "object") {
												stackValue[innerStackKey] = "[cdep:(" + getFingerPrint(innerValueIndex, stack) + ")]";
											}
										}
									} else {
										stack[index] = {
											"name": innerStackKey,
											"type": typeof innerStackValue,
											"parentIndex": stackKey
										};
									}
									index = index + 1;
								}
							}
						}
					}
				}
			}
			if (indexes[indexes.length - 1] === index) {
				break;
			}
		}

		return JSON.stringify(jsonData, null, 2);
	}
	window.resolveJson = resolveJson;
})();
