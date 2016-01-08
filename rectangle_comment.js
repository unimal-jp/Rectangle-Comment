/*
 * Rectangle Comment 
 * https://github.com/unimal-jp/Rectangle-Comment
 *
 * Copyright (c) 2016 unimal Co.,Ltd.
 * http://unimal.jp/
*/

//Constructor:

    //example code : 
    //
    //  var rectangleComment = new RectangleComment("example",
    //    {
    //      resources : {
    //        labelAddButton : "Add"
    //      },
    //
    //      onBeforeRectCreated : function(x, y, width, height, color, number, comment) {
    //        return {
    //          userName : "Tom",                          //option
    //          userIcon : "http://icon.test/img/tom.png", //option
    //          date : "2016/01/06 20:50:30"               //option
    //        };
    //      },
    //    }
    //  );
	RectangleComment = function(imgId, options) {
		this._init(imgId, options);
	};

//Public methods:

	//param date is a string already formatted (e.g. "2016/01/06 20:50:30").
	RectangleComment.prototype.addRect = function(x, y, width, height, color, comment, date, userName, userIcon) {
		this._addRect(x, y, width, height, color, comment, date, userName, userIcon);
	};

	RectangleComment.prototype.setBorderColor = function(color) {
		this._borderColor = color;
	};

	RectangleComment.prototype.resizeImage = function(value) {
		this._resizeImage(value);
	};

	RectangleComment.prototype.enable = function() {
		this._enable();
	};

	RectangleComment.prototype.disable = function() {
		this._disable();
	};

//Private variables:

	RectangleComment.prototype.STATE_NONE = "none";
	RectangleComment.prototype.STATE_SPECIFYING_RANGE = "specifying_range";
	RectangleComment.prototype.STATE_EDITING_COMMENT = "editing_comment";

	RectangleComment.prototype._numberAreaWidth = 18;
	RectangleComment.prototype._numberAreaHeight = 18;

	RectangleComment.prototype._isEnabled = true;

	RectangleComment.prototype._state = "";

	RectangleComment.prototype._imgOrgWidth = 0;
	RectangleComment.prototype._imgOrgHeight = 0;

	RectangleComment.prototype._img = null;
	RectangleComment.prototype._imgParent = null;

	RectangleComment.prototype._filterLeftEl = null;
	RectangleComment.prototype._filterTopEl = null;
	RectangleComment.prototype._filterRightEl = null;
	RectangleComment.prototype._filterBottomEl = null;

	RectangleComment.prototype._rangeRectEl = null;
	RectangleComment.prototype._commentAreaEl = null;

	RectangleComment.prototype._imgSizeRate = 100;

	RectangleComment.prototype._rects = []; //[{x, y, width, height, color, number, org_x, org_y, org_height, org_width}]
	RectangleComment.prototype._currentRect = {x:0, y:0, width:0, height:0};
	RectangleComment.prototype._startPoint = {}; //{x, y}
	RectangleComment.prototype._selectedRectRef = null; //{x, y, width, height, color, number, org_x, org_y, org_height, org_width}
	RectangleComment.prototype._selectedRectInitial = {}; //{x, y, width, height}

	RectangleComment.prototype._number = 1;

	RectangleComment.prototype._imgLoaded = false;

//user-settable via constructor or public methods

	RectangleComment.prototype._onBeforeRectCreated = null;

	//for internationalization
	RectangleComment.prototype._resources = {};

	RectangleComment.prototype._borderColor = 'rgba(255,255,255,0.90)';


//Private methods:

	RectangleComment.prototype._init = function(imgId, options) {
		this._img = document.getElementById(imgId);
		this._imgParent = this._img.parentNode

		if ((options !== undefined) && (options !== null)) {
			if (options.onBeforeRectCreated !== undefined) {
				this._onBeforeRectCreated = options.onBeforeRectCreated;
			}
			if (options.resources !== undefined) {
				this._resources = options.resources;
			}			
		}

		this._state = this.STATE_NONE;

		this._clearRects();

		this._filterLeftEl = this._createFilterEl('filter-left');
		this._filterTopEl = this._createFilterEl('filter-top');
		this._filterRightEl = this._createFilterEl('filter-right');
		this._filterBottomEl = this._createFilterEl('filter-bottom');

		this._rangeRectEl = this._createRangeRectEl();
		this._commentFormEl = this._createCommentFormEl();
		this._commentAreaEl = this._createCommentAreaEl();

		this.hideOperationEls();

		var self = this;

		this._img.addEventListener('mousedown', function(e){self._mouseDown(e)}, false);
		this._img.addEventListener('mouseup', function(e){self._mouseUp(e)}, false);
		this._img.addEventListener('mousemove', function(e){self._mouseMove(e)}, false);

		this._img.addEventListener('load', function(){
			self._imgOrgWidth = self._img.width;
			self._imgOrgHeight = self._img.height;

			self._imgLoaded = true;
		});
	};

	RectangleComment.prototype._enable = function() {
		//Wait until loading the image completes.
		if (!this._imgLoaded) {
			var self = this;
			setTimeout(function() {
				self._enable();
			}, 500);
			return;
		}

		this._isEnabled = true;

		var rects = this._rects;

		for (var i=0; i < rects.length; i++) {
			rects[i].el.style.display = "block";
		}
	};

	RectangleComment.prototype._disable = function() {
		//Wait until loading the image completes.
		if (!this._imgLoaded) {
			var self = this;
			setTimeout(function() {
				self._disable();
			}, 500);
			return;
		}

		this._isEnabled = false;

		var rects = this._rects;

		for (var i=0; i < rects.length; i++) {
			rects[i].el.style.display = "none";
		}
	};

//Mouse event handlers:

	RectangleComment.prototype._mouseDown = function(e) {
		if (!this._isEnabled) {
			return;
		}

		if (this._state == this.STATE_EDITING_COMMENT) {
			return;
		}
		if (this._state == this.STATE_SPECIFYING_RANGE) { //この状態はないはず。
			return;
		}

		this._state = this.STATE_SPECIFYING_RANGE;

		var x = e.offsetX;
		var y = e.offsetY;

		this._startPoint.x = x;
		this._startPoint.y = y;

		e.preventDefault();
	};

	RectangleComment.prototype._cursorPostion = "";

	RectangleComment.prototype.IN_RECT_NOT_ON_LINE = "in_rect_not_on_line";

	RectangleComment.prototype._mouseMove = function(e) {
		if (!this._isEnabled) {
			return;
		}

		if (this._state != this.STATE_SPECIFYING_RANGE) {
			return;
		}

		var x = e.offsetX;
		var y = e.offsetY;

		if ((x > this._img.width) || (y > this._img.height)) {
			return;
		}

		for (var i = 0; i < e.currentTarget.classList.length; i++) {
			if ((e.currentTarget.classList[i] == 'filter') || (e.currentTarget.classList[i] == 'range-rect') ||
				(e.currentTarget.classList[i] == 'comment-form')) {
				x += (e.currentTarget.offsetLeft - this._img.offsetLeft);
				y += (e.currentTarget.offsetTop - this._img.offsetTop);
				break;
			}
		}
	
		var distanceX = x - this._startPoint.x;
		var distanceY = y - this._startPoint.y;
		this._setCurrentRect(this._startPoint.x, this._startPoint.y, distanceX, distanceY);

		this._showRangeRect(this._currentRect);
		this._showCommentForm(this._currentRect);
		this._showFilter(this._currentRect);

		e.preventDefault();
	};

	RectangleComment.prototype._mouseUp = function(e) {
		if (!this._isEnabled) {
			return;
		}

		if (this._state != this.STATE_SPECIFYING_RANGE) {
			return;
		}

		var x = e.offsetX;
		var y = e.offsetY;

		//Draw a smallest rect if mouse position has not moved.
		if ((x == this._startPoint.x) && (y == this._startPoint.y)) {
			this._setCurrentRect(x, y, 50, 50);

			this._showRangeRect(this._currentRect);
			this._showCommentForm(this._currentRect);
			this._showFilter(this._currentRect);
		}


		this._state = this.STATE_EDITING_COMMENT;

		this._focusCommentTextArea();

		e.preventDefault();
	};

	RectangleComment.prototype._focusCommentTextArea = function() {
		this._commentFormEl.getElementsByClassName('comment-textarea')[0].focus();
	};

	RectangleComment.prototype._cancelEditComment = function() {
		this._state = this.STATE_NONE;

		this.hideOperationEls();
	};

	RectangleComment.prototype._commitComment = function() {
		var comment = this._commentFormEl.getElementsByClassName('comment-textarea')[0].value;

		if ((comment === undefined) || (comment == "")) {
			return;
		}

		this._state = this.STATE_NONE;

		this.hideOperationEls();

		this._currentRect.comment = comment;
		this._createRect(this._currentRect);
	};

	RectangleComment.prototype.hideOperationEls = function() {
		this._hideRangeRect();
		this._hideFilter();
		this._hideCommentForm();
		this._hideCommentArea();
	};

	//unit of value is percet (1 - 100)
	RectangleComment.prototype._resizeImage = function(value) {
		//Wait until loading the image completes.
		if (!this._imgLoaded) {
			var self = this;
			setTimeout(function(value) {
				self._resizeImage(value);
			}, 500, value);
			return;
		}
		
		this._imgSizeRate = value;

		var newWidth = Math.ceil(this._imgOrgWidth * this._imgSizeRate / 100);
		var newHeight = Math.ceil(this._imgOrgHeight * this._imgSizeRate / 100);

		this._img.width = newWidth;
		this._img.height = newHeight;

		this._img.width = newWidth;
		this._img.height = newHeight;

		for (var i = 0, len = this._rects.length ; i < len; i++) {
			this._rects[i].x = Math.ceil(this._rects[i].org_x * this._imgSizeRate / 100);
			this._rects[i].y = Math.ceil(this._rects[i].org_y * this._imgSizeRate / 100);
			this._rects[i].width = Math.ceil(this._rects[i].org_width * this._imgSizeRate / 100);
			this._rects[i].height = Math.ceil(this._rects[i].org_height * this._imgSizeRate / 100);

			var el = this._rects[i].el;

			el.style.top = this._rects[i].y + 'px';
			el.style.left = this._img.offsetLeft + this._rects[i].x + 'px';
			el.style.width = this._rects[i].width + 'px';
			el.style.height = this._rects[i].height + 'px';
				
		}	
	};

	RectangleComment.prototype._clearRects = function() {
		for (var i = 0, len = this._rects.length ; i < len; i++) {

			var el = this._rects[i].el;
			el.parentNode.removeChild(el);				
		}

		this._rects = [];
	};

//Operations of rectangle objects:

	RectangleComment.prototype._createRect = function(rect) {
		var newRect = this._copyRect(rect);
		this._normalizeRect(newRect);

		//Minimum size
		if (newRect.width < this._numberAreaWidth) {
			newRect.width = this._numberAreaWidth;
		}
		if (newRect.height < this._numberAreaHeight) {
			newRect.height = this._numberAreaHeight;
		}

		newRect.color = this._borderColor;

		//Reflect scale
		newRect.org_x = Math.floor(newRect.x * 100 / this._imgSizeRate);
		newRect.org_y = Math.floor(newRect.y * 100 / this._imgSizeRate);
		newRect.org_width = Math.floor(newRect.width * 100 / this._imgSizeRate);
		newRect.org_height = Math.floor(newRect.height * 100 / this._imgSizeRate);

		//Callback
		if (this._onBeforeRectCreated != null) {
			
			var ret = this._onBeforeRectCreated(newRect.org_x, newRect.org_y, newRect.org_width, newRect.org_height, newRect.color, this._number, newRect.comment);

			//Do not create a rect if callback returns false.
			if (ret !== false) {
				if (ret.userName !== undefined) { newRect.userName = ret.userName; }
				if (ret.userIcon !== undefined) { newRect.userIcon = ret.userIcon;}
				if (ret.date !== undefined) { newRect.date = ret.date;}

				newRect.number = this._number;
				this._number++;

				newRect.el = this._createRectEl(newRect);
				this._rects.push(newRect);				
			}
		} else {
			newRect.number = this._number;
			this._number++;

			newRect.el = this._createRectEl(newRect);
			this._rects.push(newRect);	
		}
	};

	RectangleComment.prototype._addRect = function(x, y, width, height, color, comment, date, userName, userIcon) {
		if (!this._imgLoaded) {
			var self = this;
			setTimeout(function(x, y, width, height, color, comment, date, userName, userIcon) {
				self._addRect(x, y, width, height, color, comment, date, userName, userIcon);
			}, 500, x, y, width, height, color, comment, date, userName, userIcon);
			return;
		}

		var newRect = {
			x: Math.ceil(x * this._imgSizeRate / 100),
			y: Math.ceil(y * this._imgSizeRate / 100),
			width: Math.ceil(width * this._imgSizeRate / 100),
			height: Math.ceil(height * this._imgSizeRate / 100),
			number: this._number,
			org_x: x,
			org_y: y,
			org_width: width,
			org_height: height,
			color:color,
			comment:comment,
			date:date,
			userName:userName,
			userIcon:userIcon
		};

		this._number++;

		newRect.el = this._createRectEl(newRect);
		this._rects.push(newRect);		
	};

	RectangleComment.prototype._copyRect = function(rect) {
		var newRect = {};
		this._setRect(newRect, rect.x, rect.y, rect.width, rect.height, rect.comment)

		return 	newRect;
	};

	RectangleComment.prototype._setCurrentRect = function(x, y, width, height) {
		this._setRect(this._currentRect, x, y, width, height);
		this._normalizeRect(this._currentRect);
	};

	RectangleComment.prototype._setRect = function(rect, x, y, width, height, comment) {
		rect.x = x;
		rect.y = y;
		rect.width = width;
		rect.height = height;
		rect.comment = comment;
	};

	RectangleComment.prototype._normalizeRect = function(rect) {
		if (rect.width < 0) {
			rect.x = rect.x + rect.width
			rect.width = rect.width * (-1);
		}
		if (rect.height < 0) {
			rect.y = rect.y + rect.height;
			rect.height = rect.height * (-1);
		}
	};

	RectangleComment.prototype._createFilterEl = function(cl) {
		var el = this._imgParent.getElementsByClassName(cl)[0];
		if (el != undefined) {
			return el;
		}

		var el = document.createElement('div');
		this._imgParent.appendChild(el);

		el.classList.add(cl);
		el.classList.add('filter');

		el.style.position = "absolute";
		el.style.backgroundColor = "#000";
		el.style.opacity = 0.5;
		el.style.zIndex = 1000;

		var self = this;

		el.addEventListener('mousemove', function(e){self._mouseMove(e)}, false);
		el.addEventListener('mouseup', function(e){self._mouseUp(e)}, false);

		return el;
	};

	RectangleComment.prototype._createRangeRectEl = function() {
		var el = this._imgParent.getElementsByClassName('range-rect')[0];
		if (el != undefined) {
			return el;
		}

		var el = document.createElement('div');
		this._imgParent.appendChild(el);

		el.classList.add('range-rect');

		el.style.position = "absolute";
		el.style.border = "1px solid rgba(255,255,255,0.90)";
		el.style.boxShadow = "0px 0px 2px 0px rgba(0,0,0,0.70)";
		el.style.zIndex = 1000;

		var self = this;

		el.addEventListener('mousemove', function(e){self._mouseMove(e)}, false);
		el.addEventListener('mouseup', function(e){self._mouseUp(e)}, false);

		var cornersParent = document.createElement('div');
		el.appendChild(cornersParent);

		cornersParent.style.position = "relative";
		cornersParent.style.width = "100%";
		cornersParent.style.height = "100%";
		
			var child = document.createElement('div');
			cornersParent.appendChild(child);

			child.style.position = "absolute";
			child.style.top = 0;
			child.style.left = 0;
			child.style.width = "10px";
			child.style.height = "10px";
			child.style.borderTop = "2px solid rgba(255,255,255,0.90)"
			child.style.borderLeft = "2px solid rgba(255,255,255,0.90)"
			

			var child = document.createElement('div');
			cornersParent.appendChild(child);

			child.style.position = "absolute";
			child.style.top = 0;
			child.style.right = 0;
			child.style.width = "10px";
			child.style.height = "10px";
			child.style.borderTop = "2px solid rgba(255,255,255,0.90)"
			child.style.borderRight = "2px solid rgba(255,255,255,0.90)"
			

			var child = document.createElement('div');
			cornersParent.appendChild(child);

			child.style.position = "absolute";
			child.style.bottom = 0;
			child.style.left = 0;
			child.style.width = "10px";
			child.style.height = "10px";
			child.style.borderBottom = "2px solid rgba(255,255,255,0.90)"
			child.style.borderLeft = "2px solid rgba(255,255,255,0.90)"		
			
			var child = document.createElement('div');
			cornersParent.appendChild(child);

			child.style.position = "absolute";
			child.style.bottom = 0;
			child.style.right = 0;
			child.style.width = "10px";
			child.style.height = "10px";
			child.style.borderBottom = "2px solid rgba(255,255,255,0.90)"
			child.style.borderRight = "2px solid rgba(255,255,255,0.90)"		
			
		return el;
	};

	RectangleComment.prototype._createRectEl = function(rect) {
		var el = document.createElement('div');
		this._imgParent.appendChild(el);

		el.classList.add('rect');

		el.style.position = "absolute";
		el.style.border = "1px solid " + rect.color;
		el.style.boxShadow = "0px 0px 2px 0px rgba(0,0,0,0.70)";

		el.style.top = rect.y + 'px';
		el.style.left = this._img.offsetLeft + rect.x + 'px';
		el.style.width = rect.width + 'px';
		el.style.height = rect.height + 'px';

		var self = this;

		el.onmouseover = function(){self._showCommentOfRectEl(this)};
		el.onmouseout  = function(){self._hideCommentArea()};	

		var cornersParent = document.createElement('div');
		el.appendChild(cornersParent);

		cornersParent.style.position = "relative";
		cornersParent.style.width = "100%";
		cornersParent.style.height = "100%";

		cornersParent.style.background = "rgba(255,255,255,0.30)";
		
		var radius = 20;

		if ((rect.number !== undefined) && (rect.number !== null) && (rect.number !== "")) {
			var topLeft = document.createElement('div');
			cornersParent.appendChild(topLeft);

			topLeft.classList.add('number-badge');

			topLeft.style.fontSize = "14px";
			topLeft.style.position = "absolute";
			topLeft.style.top = 0 - Math.floor(radius / 2) + "px";
			topLeft.style.left = 0 - Math.floor(radius / 2) + "px";
			topLeft.style.width = radius + "px";
			topLeft.style.height = radius + "px";
			topLeft.style.borderRadius = radius + "px";
			topLeft.style.background = "#51575A";
			topLeft.style.border = "2px solid " + rect.color;
			topLeft.style.textAlign = "center";
			topLeft.style.color = "white";
			topLeft.style.zIndex = 1000;

			topLeft.textContent = rect.number;
		} else {
			var topLeft = document.createElement('div');
			cornersParent.appendChild(topLeft);

			topLeft.style.position = "absolute";
			topLeft.style.top = 0;
			topLeft.style.left = 0;
			topLeft.style.width = "10px";
			topLeft.style.height = "10px";
			topLeft.style.borderTop = "2px solid rgba(255,255,255,0.90)"
			topLeft.style.borderLeft = "2px solid rgba(255,255,255,0.90)"
		}

		if ((rect.userIcon !== undefined) && (rect.userIcon !== null) && (rect.userIcon !== "")) {
			var topRight = document.createElement('img');
			cornersParent.appendChild(topRight);

			topRight.classList.add('user-icon-badge');

			topRight.style.position = "absolute";
			topRight.style.top = 0 - Math.floor(radius / 2) + "px";
			topRight.style.right = 0 - Math.floor(radius / 2) + "px";
			topRight.style.width = radius + "px";
			topRight.style.height = radius + "px";
			topRight.style.borderRadius = radius + "px";
			topRight.style.border = "2px solid " + rect.color;
			topRight.style.zIndex = 1000;

			topRight.src = rect.userIcon;
		} else {
			var topRight = document.createElement('div');
			cornersParent.appendChild(topRight);

			topRight.style.position = "absolute";
			topRight.style.top = 0;
			topRight.style.right = 0;
			topRight.style.width = "10px";
			topRight.style.height = "10px";
			topRight.style.borderTop = "2px solid " + rect.color;
			topRight.style.borderRight = "2px solid " + rect.color;
		}

			var bottomLeft = document.createElement('div');
			cornersParent.appendChild(bottomLeft);

			bottomLeft.style.position = "absolute";
			bottomLeft.style.bottom = 0;
			bottomLeft.style.left = 0;
			bottomLeft.style.width = "10px";
			bottomLeft.style.height = "10px";
			bottomLeft.style.borderBottom = "2px solid " + rect.color;	
			bottomLeft.style.borderLeft = "2px solid " + rect.color;
			
			var bottomRight = document.createElement('div');
			cornersParent.appendChild(bottomRight);

			bottomRight.style.position = "absolute";
			bottomRight.style.bottom = 0;
			bottomRight.style.right = 0;
			bottomRight.style.width = "10px";
			bottomRight.style.height = "10px";
			bottomRight.style.borderBottom = "2px solid " + rect.color;
			bottomRight.style.borderRight = "2px solid " + rect.color;	
			
		return el;
	};

	RectangleComment.prototype._createCommentFormEl = function() {
		var el = this._imgParent.getElementsByClassName('comment-form')[0];
		if (el != undefined) {
			return el;
		}

		var commentForm = document.createElement('div');
		this._imgParent.appendChild(commentForm);

		commentForm.classList.add('comment-form');

		commentForm.style.display = 'none';
		commentForm.style.position = "absolute";
		commentForm.style.height = "300px";
		commentForm.style.zIndex = 1001;

		var self = this;

		commentForm.addEventListener('mousemove', function(e){self._mouseMove(e)}, false);
		commentForm.addEventListener('mouseup', function(e){self._mouseUp(e)}, false);

			var arrowUp = document.createElement('div');
			commentForm.appendChild(arrowUp);

			arrowUp.classList.add('arrow-up');

			arrowUp.style.marginLeft = "15px";
			arrowUp.style.width = "0";
			arrowUp.style.height = "0";
			arrowUp.style.borderLeft = "14px solid transparent";
			arrowUp.style.borderRight = "20px solid transparent";
			arrowUp.style.borderBottom = "20px solid rgba(255,255,255,0.7)";

			var commentBody = document.createElement('div');
			commentForm.appendChild(commentBody);

			commentBody.classList.add('comment-body');

			commentBody.style.width = "350px";
			commentBody.style.paddingTop = "5px";
			commentBody.style.paddingRight = "10px";
			commentBody.style.paddingLeft = "10px";
			commentBody.style.paddingBottom = "5px";
			commentBody.style.backgroundColor = "rgba(255,255,255,0.7)";
			commentBody.style.borderRadius = "5px";
			commentBody.style.position = "relative";

				var cancelButton = document.createElement('div');
				commentBody.appendChild(cancelButton);

				cancelButton.classList.add('cancel-button');

				cancelButton.textContent = 'x';
				
				cancelButton.style.position = "absolute";
				cancelButton.style.right = "10px";
				cancelButton.style.top = "0";
				cancelButton.style.fontSize = "21px";
				cancelButton.style.fontWeight = "bold";
				cancelButton.style.lineHeight = "1";
				cancelButton.style.color = "black";
				cancelButton.style.textShadow = "0 1px 0 white";
				cancelButton.style.opacity = "0.2";
				cancelButton.style.cursor = "pointer";

				cancelButton.addEventListener('click', function(e){self._cancelEditComment(e)}, false);

				var commentTextArea = document.createElement('textarea');
				commentBody.appendChild(commentTextArea);

				commentTextArea.classList.add('comment-textarea');		

				commentTextArea.style.marginTop = "20px";
				commentTextArea.style.marginBottom = "5px";
				commentTextArea.style.setProperty('width', 'calc(100% - 22px)', 'important');
				commentTextArea.style.resize = "none";
				commentTextArea.style.height = "66px";
				commentTextArea.style.border = "1px solid #d9d9d9";
				commentTextArea.style.borderRadius = "4px";

				var addButton = document.createElement('button');
				commentBody.appendChild(addButton);

				addButton.classList.add('btn');
				addButton.classList.add('btn-lg');
				addButton.classList.add('btn-3d');
				addButton.classList.add('btn-success');

				if (self._resources.labelAddButton !== undefined) {
					addButton.textContent = self._resources.labelAddButton;
				} else {
					addButton.textContent = 'Add';
				}

				addButton.style.float = "right";

				addButton.addEventListener('click', function(e){self._commitComment(e)}, false);
				
				//reset float
				var clearDiv = document.createElement('div');
				commentBody.appendChild(clearDiv);

				clearDiv.style.clear = "both";

		return commentForm;
	};

	RectangleComment.prototype._createCommentAreaEl = function() {
		var el = this._imgParent.getElementsByClassName('comment-area')[0];
		if (el != undefined) {
			return el;
		}

		var commentArea = document.createElement('div');
		this._imgParent.appendChild(commentArea);

		commentArea.classList.add('comment-area');

		commentArea.style.position = "absolute";
		commentArea.style.zIndex = 1001;

		commentArea.onmouseover = function(){this.style.display = "block"};
		commentArea.onmouseout  = function(){this.style.display = "none"};	

			var arrowUp = document.createElement('div');
			commentArea.appendChild(arrowUp);

			arrowUp.classList.add('arrow-up');

			arrowUp.style.marginLeft = "15px";
			arrowUp.style.width = "0";
			arrowUp.style.height = "0";
			arrowUp.style.borderLeft = "14px solid transparent";
			arrowUp.style.borderRight = "20px solid transparent";
			arrowUp.style.borderBottom = "20px solid rgba(255,255,255,0.7)";

			var commentBody = document.createElement('div');
			commentArea.appendChild(commentBody);

			commentBody.classList.add('comment-area-body');

			commentBody.style.width = "350px";
			commentBody.style.paddingTop = "10px";
			commentBody.style.paddingRight = "10px";
			commentBody.style.paddingLeft = "10px";
			commentBody.style.paddingBottom = "10px";
			commentBody.style.backgroundColor = "rgba(255,255,255,0.7)";
			commentBody.style.borderRadius = "5px";
			commentBody.style.position = "relative";
			commentBody.style.minHeight = "40px";

				var userIcon = document.createElement('img');
				commentBody.appendChild(userIcon);

				userIcon.classList.add('user-icon');

				userIcon.style.width = "40px";
				userIcon.style.height = "40px";
				userIcon.style.borderRadius = "6px";
				userIcon.style.float = "left";
				userIcon.style.marginRight = "5px";

				var commentRightside = document.createElement('div');
				commentBody.appendChild(commentRightside);

				commentRightside.classList.add('comment-rightside');

					var commentMessage = document.createElement('div');
					commentRightside.appendChild(commentMessage);

					commentMessage.classList.add('comment-message');

					commentMessage.style.fontSize = "14px";
					commentMessage.style.fontWeight = "bold";

					var commentInfo = document.createElement('div');
					commentRightside.appendChild(commentInfo);

					commentInfo.classList.add('comment-info');

					commentInfo.style.fontSize = "14px";

		return commentArea;
	};

	RectangleComment.prototype._showFilter = function(rect) {

		var canvasViewableHeight = this._img.height;

		this._filterLeftEl.style.display = 'block';
		this._filterTopEl.style.display = 'block';
		this._filterRightEl.style.display = 'block';
		this._filterBottomEl.style.display = 'block';

		this._filterLeftEl.style.top = 0 + 'px';
		this._filterLeftEl.style.left = this._img.offsetLeft + 'px';
		this._filterLeftEl.style.width = rect.x + 'px';
		this._filterLeftEl.style.height = canvasViewableHeight + 'px';
		
		this._filterTopEl.style.top = 0 + 'px';
		this._filterTopEl.style.left = this._img.offsetLeft + rect.x + 'px';
		this._filterTopEl.style.width = rect.width + 'px';
		this._filterTopEl.style.height = rect.y + 'px';

		this._filterRightEl.style.top = 0 + 'px';
		this._filterRightEl.style.left = this._img.offsetLeft + rect.x + rect.width + 'px';
		this._filterRightEl.style.width = this._img.width -  rect.x - rect.width + 'px';
		this._filterRightEl.style.height = canvasViewableHeight + 'px';

		this._filterBottomEl.style.top = rect.y + rect.height + 'px';
		this._filterBottomEl.style.left = this._img.offsetLeft + rect.x + 'px';
		this._filterBottomEl.style.width = rect.width + 'px';
		this._filterBottomEl.style.height = canvasViewableHeight - rect.y - rect.height + 'px';		
	};

	RectangleComment.prototype._hideFilter = function() {
		this._filterLeftEl.style.display = 'none';
		this._filterTopEl.style.display = 'none';
		this._filterRightEl.style.display = 'none';
		this._filterBottomEl.style.display = 'none';	
	};

	RectangleComment.prototype._showRangeRect = function(rect) {
		this._rangeRectEl.style.display = 'block';

		this._rangeRectEl.style.top = rect.y + 'px';
		this._rangeRectEl.style.left = this._img.offsetLeft + rect.x + 'px';
		this._rangeRectEl.style.width = rect.width + 'px';
		this._rangeRectEl.style.height = rect.height + 'px';
	};

	RectangleComment.prototype._hideRangeRect = function() {
		this._rangeRectEl.style.display = 'none';
	};

	RectangleComment.prototype._showCommentForm = function(rect) {
		this._commentFormEl.getElementsByClassName('comment-textarea')[0].value = "";

		this._commentFormEl.style.display = 'block';

		this._commentFormEl.style.top = rect.y + rect.height + 'px';
		this._commentFormEl.style.left = this._img.offsetLeft + rect.x + 'px';
	};

	RectangleComment.prototype._hideCommentForm = function() {
		this._commentFormEl.style.display = 'none';
	};

	RectangleComment.prototype._showCommentArea = function(rect) {
		var userIcon = rect.userIcon;
		var userIconEl = this._commentAreaEl.getElementsByClassName('user-icon')[0];

		if ((userIcon === undefined) || (userIcon === null) || (userIcon === "")) {
			userIconEl.style.display = 'none';
		} else {
			userIconEl.style.display = 'block';
			userIconEl.src = userIcon;
		}

		var commnetHtml = this._escapeHTML(rect.comment).replace(/(\n|\r)/g, "<br />");
		this._commentAreaEl.getElementsByClassName('comment-message')[0].innerHTML = commnetHtml;

		var commentInfo = "";
		var userName = rect.userName;
		if ((userName !== undefined) && (userName !== null) && (userName !== "")) {
			commentInfo = userName + " ";
		}
		var date = rect.date;
		if ((date !== undefined) && (userIcon !== null)) {
			commentInfo += date;
		}

		this._commentAreaEl.getElementsByClassName('comment-info')[0].textContent = commentInfo;

		this._commentAreaEl.style.display = 'block';

		this._commentAreaEl.style.top = rect.y + rect.height + 'px';
		this._commentAreaEl.style.left = this._img.offsetLeft + rect.x + 'px';
	};

	RectangleComment.prototype._escapeHTML = function (html) {
  		var elem = document.createElement('div');
  		elem.appendChild(document.createTextNode(html));
  		return elem.innerHTML;
	};

	RectangleComment.prototype._hideCommentArea = function() {
		this._commentAreaEl.style.display = 'none';
	};

	RectangleComment.prototype._showCommentOfRectEl = function(rectEl) {
		for (var i = 0, len = this._rects.length ; i < len; i++) {
			if (this._rects[i].el == rectEl) {
				this._showCommentArea(this._rects[i]);
				break;
			}
		}		
	};
