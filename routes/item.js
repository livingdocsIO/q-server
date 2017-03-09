const getDb = require('../db.js').getDb;
const Boom = require('boom');
const Joi = require('joi');

module.exports = [
  {
    path: '/item/{id}',
    method: 'GET',
    handler: (request, reply) => {
      let db = getDb();
      db.get(request.params.id, (err, doc) => {
        if (err) {
          return reply(Boom.error(err.statusCode, err.description))
        }
        return reply(doc).type('application/json')
      })
    }
  },
  {
    path: '/item',
    method: 'POST',
    config: {
      validate: {
        payload: {
          _id: Joi.forbidden(),
          _rev: Joi.forbidden(),
          title: Joi.string().required()
        },
        options: {
          allowUnknown: true
        }
      },
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      description: 'stores a new item to the database and returns the id among other things',
      tags: ['api']
    },
    handler: (request, reply) => {
      let db = getDb();
      let doc = request.payload;
      let now = new Date();

      // docDiff is used to store all the changed properties
      // to send them back to Q Editor for it to merge it with
      // the existing item state
      let docDiff = {}

      doc.createdDate = now.toISOString();
      docDiff.createdDate = doc.createdDate;
      doc.createdBy = request.auth.credentials.name;
      docDiff.createdBy = doc.createdBy;

      db.insert(request.payload, (err, res) => {
        if (err) {
          return reply(Boom.create(err.statusCode, err.description))
        }

        docDiff._id = res.id;
        docDiff._rev = res.rev;

        return reply(docDiff).type('application/json')
      })
    }
  },
  {
    path: '/item',
    method: 'PUT',
    config: {
      validate: {
        payload: {
          _id: Joi.string().required(),
          _rev: Joi.string().required(),
          title: Joi.string().required()
        },
        options: {
          allowUnknown: true
        }
      },
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      description: 'updates an existing item to the database and returns the new revision number among other things',
      tags: ['api']
    },
    handler: (request, reply) => {
      let db = getDb();
      let doc = request.payload;
      let now = new Date();
      
      // docDiff is used to store all the changed properties
      // to send them back to Q Editor for it to merge it with
      // the existing item state
      let docDiff = {}

      doc.updatedDate = now.toISOString();
      doc.updatedBy = request.auth.credentials.name;

      db.get(request.payload._id, (err, oldDoc) => {
        // if the active state change to true, we set activateDate
        if (doc.active === true && oldDoc.active === false) {
          doc.activateDate = now.toISOString();
          docDiff.activateDate = doc.activateDate;
        }

        // if the active state change to false, we set activateDate
        if (doc.active === false && oldDoc.active === true) {
          doc.deactivateDate = now.toISOString();
          docDiff.deactivateDate = doc.deactivateDate;
        }

        db.insert(doc, (err, res) => {
          if (err) {
            return reply(Boom.create(err.statusCode, err.description))
          }

          docDiff._rev = res.rev;

          return reply(docDiff).type('application/json')
        })
      })
    }
  }
]