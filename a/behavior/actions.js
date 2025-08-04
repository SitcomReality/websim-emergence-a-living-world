+++ b/behavior/actions.js
@@ -75,6 +75,22 @@
     }
 }
 
+export function storeTradedGoods(entity) {
+    if (entity.tradeInventory.items.length === 0) {
+        entity.currentTask = 'idle';
+        return;
+    }
+
+    const depositPoint = entity.getDepositPoint();
+    if (depositPoint) {
+        entity.targetX = depositPoint.x;
+        entity.targetY = depositPoint.y;
+        entity.targetNode = depositPoint;
+        entity.currentTask = 'storing traded goods';
+    } else {
+        entity.currentTask = 'idle'; // Can't store if no home
+    }
+}
+
 export function explore(entity) {
     entity.currentTask = 'exploring';
     // Aim for a region of the map they haven't been to recently


