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

async function requestClipboard(id) {
    try {
        const permissionStatus = await navigator.permissions.query({ name: "clipboard-read" });

        if (permissionStatus.state === "granted" || permissionStatus.state === "prompt") {
            navigator.clipboard.readText().then(
                clipText => {
                    onClipboardReady(id, clipText);
                }
            );
        } else {
            console.error('Permission to read clipboard was denied');
        }
    } catch (err) {
        console.error('Failed to request clipboard read permission: ', err);
    }
}
