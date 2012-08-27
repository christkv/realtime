var Data = function Data(db, config) {
  this.db = db;
  this.config = config ? config : { throttle_number: 1000 };
  this.collection = this.db ? this.db.collection('data') : null;
  // Simple counter allowing us to throttle the number of inserts by using getLastError
  // once in a while
  this.throttleNumber = this.config.throttle_number ? this.config.throttle_number : 0;
  this.currentInsertNumber = 0;
}

Data.prototype.save = function save(data, callback) {
  if(this.collection) {
    // Let's save the data to the disk doing a getLastError if needed
    if(this.throttleNumber > 0 && this.currentInsertNumber >= this.throttleNumber) {
      // Reset the insert
      this.currentInsertNumber = 0;
      // Save the data
      this.collection.insert(data, {safe:true}, function() {});
    } else {
      this.collection.insert(data);
    }
  }
}

exports.Data = Data;