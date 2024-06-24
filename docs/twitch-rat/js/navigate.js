/*
 * Copyright (c) 2024 Juan Medina
 *
 *  All rights reserved. This software and related documentation are proprietary to Juan Medina.
 *
 *  This source code is for internal use only and may not be copied, modified, or distributed
 *  without the express written permission of Juan Medina. Any use of this software for any
 *  purpose other than its intended use is strictly prohibited and may result in severe civil
 *  and criminal penalties.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *  PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 *  FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 *  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *  DEALINGS IN THE SOFTWARE.
 */

function navigateTo(url, newTab = false) {
	if (newTab) {
		window.open(url, "_blank");
		return;
	}
	window.location.href = url;
}

function urlWithRndQueryParam(url, paramName) {
	const ulrArr = url.split("#");
	const urlQry = ulrArr[0].split("?");
	const usp = new URLSearchParams(urlQry[1] || "");
	usp.set(paramName || "_z", `${Date.now()}`);
	urlQry[1] = usp.toString();
	ulrArr[0] = urlQry.join("?");
	return ulrArr.join("#");
}

async function handleHardReload(url) {
	const newUrl = urlWithRndQueryParam(url);
	await fetch(newUrl, {
		headers: {
			Pragma: "no-cache",
			Expires: "-1",
			"Cache-Control": "no-cache",
		},
	});
	window.location.href = newUrl;
	// This is to ensure reload with url's having '#'
	window.location.reload();
}

function refresh() {
	handleHardReload(window.location.href);
}

function fetchFromUrl(url) {
	fetch(urlWithRndQueryParam(url))
		.then((response) => response.text())
		.then((text) => onFetchComplete(text))
		.catch((error) => console.error(error));
}
