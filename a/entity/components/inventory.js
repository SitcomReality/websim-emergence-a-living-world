+++ b/entity/components/inventory.js
@@ -37,7 +37,7 @@
 
     deserialize(data) {
         this.items = data.items || [];
-        this.capacity = data.capacity || 2;
+        this.capacity = data.capacity || 2; // Default to 2 if not specified
     }
 }


