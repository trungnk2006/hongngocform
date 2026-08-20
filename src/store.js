// ================================
// Data Store - Dual Mode
// localStorage (Offline/Demo) / Supabase (Free Cloud DB + Storage)
// ================================

import { supabase, isConfigured } from './supabase.js';
import { generateId } from './utils.js';

// =========================================
// localStorage Implementation
// =========================================
function createLocalStore() {
  const FORMS_KEY = 'hngf_forms';
  const RESPONSES_KEY = 'hngf_responses';

  function getData(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  return {
    async getAllForms() {
      const forms = Object.values(getData(FORMS_KEY));
      const responses = getData(RESPONSES_KEY);
      return forms
        .map((f) => ({
          ...f,
          responseCount: f.responseCount ?? (responses[f.id]?.length || 0),
        }))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    },

    async getForm(id) {
      return getData(FORMS_KEY)[id] || null;
    },

    async saveForm(form) {
      const forms = getData(FORMS_KEY);
      if (!form.id) {
        form.id = generateId();
        form.createdAt = Date.now();
        form.responseCount = 0;
      }
      form.updatedAt = Date.now();
      forms[form.id] = form;
      setData(FORMS_KEY, forms);
      return form;
    },

    async deleteForm(id) {
      const forms = getData(FORMS_KEY);
      delete forms[id];
      setData(FORMS_KEY, forms);
      const responses = getData(RESPONSES_KEY);
      delete responses[id];
      setData(RESPONSES_KEY, responses);
    },

    async getResponses(formId) {
      return getData(RESPONSES_KEY)[formId] || [];
    },

    async saveResponse(formId, response) {
      const responses = getData(RESPONSES_KEY);
      if (!responses[formId]) responses[formId] = [];
      response.id = generateId();
      response.submittedAt = Date.now();
      responses[formId].push(response);
      setData(RESPONSES_KEY, responses);

      const forms = getData(FORMS_KEY);
      if (forms[formId]) {
        forms[formId].responseCount = (forms[formId].responseCount || 0) + 1;
        setData(FORMS_KEY, forms);
      }
      return response;
    },

    async deleteResponse(formId, responseId) {
      return this.deleteResponses(formId, [responseId]);
    },

    async deleteResponses(formId, responseIds) {
      if (!responseIds || responseIds.length === 0) return;
      const idSet = new Set(responseIds);
      const responses = getData(RESPONSES_KEY);
      if (responses[formId]) {
        responses[formId] = responses[formId].filter((r) => !idSet.has(r.id));
        setData(RESPONSES_KEY, responses);
      }
      const forms = getData(FORMS_KEY);
      if (forms[formId]) {
        forms[formId].responseCount = Math.max(0, (responses[formId] || []).length);
        setData(FORMS_KEY, forms);
      }
    },


    async uploadFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ data: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    async exportResponses(formId) {
      const form = await this.getForm(formId);
      const responses = await this.getResponses(formId);
      return JSON.stringify({ form, responses }, null, 2);
    },
  };
}

// =========================================
// Supabase Implementation (100% Free Tier)
// =========================================
function createSupabaseStore() {
  const BUCKET_NAME = 'form-uploads';

  return {
    async getAllForms() {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        questions: f.questions || [],
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        responseCount: f.response_count || 0,
      }));
    },

    async getForm(id) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        questions: data.questions || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        responseCount: data.response_count || 0,
      };
    },

    async saveForm(form) {
      const id = form.id || generateId();
      const payload = {
        id,
        title: form.title,
        description: form.description || '',
        questions: form.questions || [],
        updated_at: Date.now(),
      };

      if (!form.id) {
        payload.created_at = Date.now();
        payload.response_count = 0;
      }

      const { data, error } = await supabase
        .from('forms')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return {
        ...form,
        id: data.id,
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      };
    },

    async deleteForm(id) {
      // First, get all responses to clean up uploaded files
      try {
        const responses = await this.getResponses(id);
        const filePaths = [];
        for (const resp of responses) {
          for (const ans of Object.values(resp.answers || {})) {
            if (ans && ans.storagePath) {
              filePaths.push(ans.storagePath);
            }
          }
        }
        if (filePaths.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(filePaths);
        }
      } catch (e) {
        console.warn('File cleanup notice:', e);
      }

      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
    },

    async getResponses(formId) {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        formId: r.form_id,
        answers: r.answers || {},
        submittedAt: r.submitted_at,
      }));
    },

    async saveResponse(formId, response) {
      const id = generateId();
      const submittedAt = Date.now();

      const { data, error } = await supabase
        .from('responses')
        .insert({
          id,
          form_id: formId,
          answers: response.answers || {},
          submitted_at: submittedAt,
        })
        .select()
        .single();

      if (error) throw error;

      // Update counter in forms table
      try {
        const form = await this.getForm(formId);
        if (form) {
          await supabase
            .from('forms')
            .update({ response_count: (form.responseCount || 0) + 1 })
            .eq('id', formId);
        }
      } catch (e) {
        /* ignore */
      }

      return {
        id: data.id,
        formId: data.form_id,
        answers: data.answers,
        submittedAt: data.submitted_at,
      };
    },

    async deleteResponse(formId, responseId) {
      return this.deleteResponses(formId, [responseId]);
    },

    async deleteResponses(formId, responseIds) {
      if (!responseIds || responseIds.length === 0) return;

      // Clean up any uploaded file in these responses
      try {
        const { data: resps } = await supabase
          .from('responses')
          .select('answers')
          .in('id', responseIds);

        if (resps && resps.length > 0) {
          const filePaths = [];
          for (const resp of resps) {
            for (const ans of Object.values(resp.answers || {})) {
              if (ans && ans.storagePath) {
                filePaths.push(ans.storagePath);
              }
            }
          }
          if (filePaths.length > 0) {
            await supabase.storage.from(BUCKET_NAME).remove(filePaths);
          }
        }
      } catch (e) {
        console.warn('File cleanup notice:', e);
      }

      const { error } = await supabase
        .from('responses')
        .delete()
        .in('id', responseIds);

      if (error) throw error;

      // Update counter in forms table
      try {
        const remaining = await this.getResponses(formId);
        await supabase
          .from('forms')
          .update({ response_count: remaining.length })
          .eq('id', formId);
      } catch (e) {
        /* ignore */
      }
    },


    async uploadFile(file, formId, questionId) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${formId}/${questionId}_${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      return {
        url: data.publicUrl,
        storagePath,
      };
    },

    async exportResponses(formId) {
      const form = await this.getForm(formId);
      const responses = await this.getResponses(formId);
      return JSON.stringify({ form, responses }, null, 2);
    },
  };
}

// =========================================
// Export the active store
// =========================================
export const store = isConfigured
  ? createSupabaseStore()
  : createLocalStore();

console.log(
  `[HongNgocForm] Storage mode: ${isConfigured ? '⚡ Supabase (Free Cloud)' : '💾 localStorage (Offline Mode)'}`
);
